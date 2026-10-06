import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import type { AmbiguityAnalysis, ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import { parseLogicalModelResponse } from '../../ai/providers/ollama/logical-model-response.parser';
import { AnalyzeAmbiguitiesDto } from '../dto/analyze-ambiguities.dto';
import { GenerateDiagramDto } from '../dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from '../schemas/conceptual-model.schema';
import { LogicalModel, LogicalModelSchema } from '../schemas/logical-model.schema';
import { buildConceptualModelRepairContext } from './conceptual-model-repair-context';
import { contextualizeRelationshipAttributes } from './contextualize-relationship-attributes';
import { applyExplicitCardinalityClarifications } from './explicit-cardinality-clarifications';
import { misplacedGeneratedAttributes, reconcileGeneratedAttributePlacement } from './generated-attribute-placement';
import { LogicalModelConverterService } from './logical-model-converter.service';
import { LogicalToConceptualConverterService } from './logical-to-conceptual-converter.service';
import { findCompositeAttributeInconsistencies, normalizeCompositeAttributes } from './normalize-composite-attributes';
import { reconcileAssociationAttributes } from './reconcile-association-attributes';
import { reconcileGeneratedAssociationArtifacts } from './reconcile-generated-association-artifacts';
import { unsupportedRelationshipAttributes } from './relationship-attribute-evidence';
import { SqlDialect, SqlGeneratorService } from './sql-generator.service';

type ValidationResult<TModel> = { success: true; data: TModel } | { success: false; validationError: unknown };

@Injectable()
export class DiagramsService {
  private readonly maxValidationAttempts = 2;
  private readonly logger = new Logger(DiagramsService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly logicalModelConverterService: LogicalModelConverterService,
    private readonly logicalToConceptualConverterService: LogicalToConceptualConverterService,
    private readonly sqlGeneratorService: SqlGeneratorService,
  ) {}

  async generate(dto: GenerateDiagramDto): Promise<ConceptualModel | LogicalModel> {
    const clarifications = dto.clarifications as ClarificationAnswer[] | undefined;
    if (dto.mode === 'logical') {
      return this.generateLogical(dto.description, clarifications);
    }

    return this.generateWithRepair({
      label: 'conceitual',
      invalidMessage: 'O modelo conceitual gerado é inválido.',
      initialCandidate: async () =>
        applyExplicitCardinalityClarifications(
          contextualizeRelationshipAttributes(
            reconcileGeneratedAttributePlacement(
              reconcileAssociationAttributes(
                reconcileGeneratedAssociationArtifacts(
                  this.normalizeCompositeStructure(
                    await this.aiService.generateConceptualModel(dto.description, clarifications),
                    'geração inicial',
                  ),
                ),
              ),
            ),
          ),
          clarifications,
        ),
      validate: (candidate) => {
        const parsed = ConceptualModelSchema.safeParse(candidate.model);
        const unsupportedAttributes = unsupportedRelationshipAttributes(candidate.model, clarifications);
        const misplacedAttributes = misplacedGeneratedAttributes(candidate.model);
        if (
          parsed.success &&
          candidate.unresolved.length === 0 &&
          unsupportedAttributes.length === 0 &&
          misplacedAttributes.length === 0
        ) {
          return { success: true, data: parsed.data };
        }

        return {
          success: false,
          validationError: {
            ...(candidate.unresolved.length > 0
              ? {
                  cardinalityConstraints: candidate.unresolved,
                  message: 'A IA não representou o relacionamento exigido pela cardinalidade confirmada.',
                }
              : {}),
            ...(parsed.success
              ? {}
              : {
                  tree: z.treeifyError(parsed.error),
                  repair: buildConceptualModelRepairContext(candidate.model, parsed.error),
                }),
            ...(unsupportedAttributes.length > 0 ? { unsupportedRelationshipAttributes: unsupportedAttributes } : {}),
            ...(misplacedAttributes.length > 0 ? { misplacedEntityAttributes: misplacedAttributes } : {}),
          },
        };
      },
      repair: async (candidate, validationError) =>
        applyExplicitCardinalityClarifications(
          contextualizeRelationshipAttributes(
            reconcileGeneratedAttributePlacement(
              reconcileAssociationAttributes(
                reconcileGeneratedAssociationArtifacts(
                  this.normalizeCompositeStructure(
                    await this.aiService.fixConceptualModel({
                      description: dto.description,
                      invalidModel: candidate.model,
                      validationError,
                      clarifications,
                    }),
                    'reparo',
                  ),
                ),
              ),
            ),
          ),
          clarifications,
        ),
    });
  }

  async analyzeAmbiguities(dto: AnalyzeAmbiguitiesDto): Promise<AmbiguityAnalysis> {
    try {
      return await this.aiService.analyzeAmbiguities(dto.description);
    } catch (error) {
      this.logger.warn(
        `Falha inesperada na análise de ambiguidades; a geração seguirá sem esclarecimentos. ${error instanceof Error ? error.message : String(error)}`,
      );
      return { requiresClarification: false, questions: [] };
    }
  }

  private normalizeCompositeStructure(model: ConceptualModel, phase: 'geração inicial' | 'reparo'): ConceptualModel {
    const inconsistencies = findCompositeAttributeInconsistencies(model);
    if (inconsistencies.length > 0) {
      this.logger.warn(
        `Normalização estrutural de atributos compostos na ${phase}: ${JSON.stringify(inconsistencies)}`,
      );
      return normalizeCompositeAttributes(model);
    }
    return model;
  }

  private async generateLogical(description: string, clarifications?: ClarificationAnswer[]): Promise<LogicalModel> {
    return this.generateWithRepair({
      label: 'lógico',
      invalidMessage: 'O modelo lógico gerado é inválido.',
      initialCandidate: () => this.aiService.generateLogicalModel(description, clarifications),
      validate: (candidate) => this.validateLogicalCandidate(candidate, description),
      repair: (invalidModel, validationError) =>
        this.aiService.fixLogicalModel({
          description,
          invalidModel,
          validationError,
          clarifications,
        }),
    });
  }

  private async generateWithRepair<TCandidate, TModel>(params: {
    label: 'conceitual' | 'lógico';
    invalidMessage: string;
    initialCandidate: () => Promise<TCandidate>;
    validate: (candidate: TCandidate) => ValidationResult<TModel>;
    repair: (candidate: TCandidate, validationError: unknown) => Promise<TCandidate>;
  }): Promise<TModel> {
    let candidate = await params.initialCandidate();

    for (let attempt = 1; attempt <= this.maxValidationAttempts; attempt++) {
      const validation = params.validate(candidate);
      if (validation.success) return validation.data;

      this.logger.warn(
        `Modelo ${params.label} requer correção na tentativa ${attempt}: ${JSON.stringify(validation.validationError)}`,
      );

      if (attempt === this.maxValidationAttempts) {
        throw new BadRequestException({
          message: params.invalidMessage,
          attempts: attempt,
          errors: validation.validationError,
        });
      }

      candidate = await params.repair(candidate, validation.validationError);
    }

    throw new BadRequestException({ message: params.invalidMessage });
  }

  private validateLogicalCandidate(candidate: unknown, description: string): ValidationResult<LogicalModel> {
    try {
      const logicalModel = parseLogicalModelResponse(candidate, description);
      const parsed = LogicalModelSchema.safeParse(logicalModel);

      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, validationError: z.treeifyError(parsed.error) };
    } catch (error) {
      return { success: false, validationError: validationErrorFrom(error) };
    }
  }

  convertToLogical(conceptualModel: ConceptualModel): LogicalModel {
    const parsed = ConceptualModelSchema.safeParse(conceptualModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo conceitual informado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return this.logicalModelConverterService.convert(parsed.data);
  }

  convertToConceptual(logicalModel: LogicalModel): ConceptualModel {
    const parsed = LogicalModelSchema.safeParse(logicalModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo lógico informado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return this.logicalToConceptualConverterService.convert(parsed.data);
  }

  generateSql(logicalModel: unknown, dialect: SqlDialect): string {
    const parsed = LogicalModelSchema.safeParse(logicalModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo lógico informado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    try {
      return this.sqlGeneratorService.generate(parsed.data, dialect);
    } catch (error) {
      throw new BadRequestException({
        message: error instanceof Error ? error.message : 'Não foi possível gerar o SQL.',
      });
    }
  }
}

function validationErrorFrom(error: unknown): unknown {
  if (error instanceof z.ZodError) {
    return z.treeifyError(error);
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.cause instanceof z.ZodError ? { cause: z.treeifyError(error.cause) } : {}),
    };
  }

  return { message: String(error) };
}
