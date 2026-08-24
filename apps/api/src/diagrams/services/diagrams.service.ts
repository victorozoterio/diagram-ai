import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import { GenerateDiagramDto } from '../dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from '../schemas/conceptual-model.schema';
import { LogicalModel } from '../schemas/logical-model.schema';
import { LogicalModelConverterService } from './logical-model-converter.service';

@Injectable()
export class DiagramsService {
  private readonly maxValidationAttempts = 3;

  constructor(
    private readonly aiService: AiService,
    private readonly logicalModelConverterService: LogicalModelConverterService,
  ) {}

  async generate(dto: GenerateDiagramDto): Promise<ConceptualModel> {
    let conceptualModel = await this.aiService.generateConceptualModel(dto.description);

    for (let attempt = 1; attempt <= this.maxValidationAttempts; attempt++) {
      const parsed = ConceptualModelSchema.safeParse(conceptualModel);

      if (parsed.success) {
        return parsed.data;
      }

      const validationError = z.treeifyError(parsed.error);

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
        validationError,
      });
    }

    throw new BadRequestException({
      message: 'Não foi possível gerar um modelo conceitual válido.',
    });
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
}
