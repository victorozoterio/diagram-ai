import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { ConceptualModel, ConceptualModelSchema } from './schemas/conceptual-model.schema';

@Injectable()
export class DiagramsService {
  generate(dto: GenerateDiagramDto): ConceptualModel {
    const mockConceptualModel = {
      metadata: {
        title: 'Sistema de Pedidos',
        sourceText: dto.description,
        generatedBy: 'mock',
        generatedAt: new Date().toISOString(),
      },
      entities: [
        {
          id: 'cliente',
          name: 'Cliente',
          description: 'Pessoa que realiza pedidos no sistema',
          attributes: [
            {
              id: 'cliente_id',
              name: 'id',
              type: 'uuid',
              identifier: true,
              required: true,
              unique: true,
            },
            {
              id: 'cliente_nome',
              name: 'nome',
              type: 'string',
              required: true,
            },
          ],
        },
        {
          id: 'pedido',
          name: 'Pedido',
          description: 'Pedido realizado por um cliente',
          attributes: [
            {
              id: 'pedido_id',
              name: 'id',
              type: 'uuid',
              identifier: true,
              required: true,
              unique: true,
            },
            {
              id: 'pedido_data',
              name: 'data',
              type: 'date',
              required: true,
            },
          ],
        },
      ],
      relationships: [
        {
          id: 'cliente_realiza_pedido',
          name: 'realiza',
          description: 'Um cliente pode realizar vários pedidos',
          type: '1:N',
          participants: [
            {
              entityId: 'cliente',
              cardinality: '1',
            },
            {
              entityId: 'pedido',
              cardinality: 'N',
            },
          ],
          attributes: [],
        },
      ],
      ambiguities: [],
    };

    const parsed = ConceptualModelSchema.safeParse(mockConceptualModel);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'O modelo conceitual gerado é inválido.',
        errors: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
