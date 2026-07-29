import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { AiService } from '../ai/ai.service';
import { ENV, EnvironmentVariables } from '../config/environments';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from './schemas/conceptual-model.schema';

@Injectable()
export class DiagramsService {
  private readonly model: string;

  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.model = this.configService.getOrThrow(ENV.HUGGING_FACE_MODEL);
  }

  async generate(dto: GenerateDiagramDto): Promise<ConceptualModel> {
    const aiResponse = await this.aiService.generateConceptualModel(dto.description);

    const conceptualModel = {
      ...aiResponse,
      metadata: {
        ...aiResponse.metadata,
        sourceText: dto.description,
        generatedBy: this.model,
        generatedAt: new Date().toISOString(),
      },
    };

    const parsed = ConceptualModelSchema.safeParse(conceptualModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo conceitual gerado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
