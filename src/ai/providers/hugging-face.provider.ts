import { Injectable } from '@nestjs/common';

@Injectable()
export class HuggingFaceProvider {
  async generateConceptualModel(description: string) {
    return {
      metadata: {
        title: 'Sistema de Pedidos',
        sourceText: description,
        generatedBy: 'hugging-face-mock',
        generatedAt: new Date().toISOString(),
      },
      entities: [
        {
          id: 'cliente',
          name: 'Cliente',
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
  }
}
