import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import type { AmbiguityAnalysis, ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import { AnalyzeAmbiguitiesDto } from '../dto/analyze-ambiguities.dto';
import { GenerateDiagramDto } from '../dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from '../schemas/conceptual-model.schema';
import { LogicalModel, LogicalModelSchema } from '../schemas/logical-model.schema';
import { buildConceptualModelRepairContext } from './conceptual-model-repair-context';
import { LogicalModelConverterService } from './logical-model-converter.service';
import { LogicalToConceptualConverterService } from './logical-to-conceptual-converter.service';
import { SqlDialect, SqlGeneratorService } from './sql-generator.service';

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

    let conceptualModel = await this.aiService.generateConceptualModel(dto.description, clarifications);

    for (let attempt = 1; attempt <= this.maxValidationAttempts; attempt++) {
      const parsed = ConceptualModelSchema.safeParse(conceptualModel);

      if (parsed.success) {
        return parsed.data;
      }

      const validationError = z.treeifyError(parsed.error);
      const repairContext = buildConceptualModelRepairContext(conceptualModel, parsed.error);

      this.logger.warn(
        `Modelo conceitual requer correção na tentativa ${attempt}: ${JSON.stringify({ validationError, repair: repairContext })}`,
      );

      if (attempt === this.maxValidationAttempts) {
        throw new BadRequestException({
          message: 'O modelo conceitual gerado é inválido.',
          attempts: attempt,
          errors: validationError,
        });
      }

      conceptualModel = await this.aiService.fixConceptualModel({
        description: dto.description,
        invalidModel: conceptualModel,
        validationError: {
          tree: validationError,
          repair: repairContext,
        },
        clarifications,
      });
    }

    throw new BadRequestException({
      message: 'Não foi possível gerar um modelo conceitual válido.',
    });
  }

  analyzeAmbiguities(dto: AnalyzeAmbiguitiesDto): Promise<AmbiguityAnalysis> {
    return this.aiService.analyzeAmbiguities(dto.description);
  }

  private async generateLogical(description: string, clarifications?: ClarificationAnswer[]): Promise<LogicalModel> {
    const logicalModel = await this.aiService.generateLogicalModel(description, clarifications);
    const parsed = LogicalModelSchema.safeParse(logicalModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo lógico gerado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
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
