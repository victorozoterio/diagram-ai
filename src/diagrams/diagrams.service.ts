import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiService } from '../ai/ai.service';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from './schemas/conceptual-model.schema';

@Injectable()
export class DiagramsService {
  private readonly maxValidationAttempts = 3;

  constructor(private readonly aiService: AiService) {}

  async generate(dto: GenerateDiagramDto): Promise<ConceptualModel> {
    let conceptualModel = await this.aiService.generateConceptualModel(dto.description);

    for (let attempt = 1; attempt <= this.maxValidationAttempts; attempt++) {
      conceptualModel = this.applyTrustedMetadata(conceptualModel, dto.description);

      const parsed = ConceptualModelSchema.safeParse(conceptualModel);

      if (parsed.success) {
        return parsed.data;
      }

      if (attempt === this.maxValidationAttempts) {
        throw new BadRequestException({
          message: 'O modelo conceitual gerado é inválido.',
          attempts: attempt,
          errors: z.treeifyError(parsed.error),
        });
      }

      conceptualModel = await this.aiService.fixConceptualModel({
        description: dto.description,
        invalidModel: conceptualModel,
        validationError: z.treeifyError(parsed.error),
      });
    }

    throw new BadRequestException({
      message: 'Não foi possível gerar um modelo conceitual válido.',
    });
  }

  private applyTrustedMetadata(aiResponse: unknown, description: string): Record<string, unknown> {
    if (!aiResponse || typeof aiResponse !== 'object') {
      return {
        metadata: {
          sourceText: description,
          generatedBy: process.env.HF_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct',
          generatedAt: new Date().toISOString(),
        },
        entities: [],
        relationships: [],
        ambiguities: [
          {
            id: 'resposta_invalida',
            message: 'A IA não retornou um objeto JSON válido.',
            field: 'root',
            suggestions: ['Tente reescrever a descrição com mais detalhes.'],
          },
        ],
      };
    }

    const response = aiResponse as Record<string, unknown>;
    const metadata =
      response.metadata && typeof response.metadata === 'object' ? (response.metadata as Record<string, unknown>) : {};

    return {
      ...response,
      metadata: {
        ...metadata,
        sourceText: description,
        generatedBy: process.env.HF_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct',
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
