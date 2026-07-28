import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiService } from '../ai/ai.service';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from './schemas/conceptual-model.schema';

@Injectable()
export class DiagramsService {
  constructor(private readonly aiService: AiService) {}

  async generate(dto: GenerateDiagramDto): Promise<ConceptualModel> {
    const aiResponse = await this.aiService.generateConceptualModel(dto.description);

    const parsed = ConceptualModelSchema.safeParse(aiResponse);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo conceitual gerado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
