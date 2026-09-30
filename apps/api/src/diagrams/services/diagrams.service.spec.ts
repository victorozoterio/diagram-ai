import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { AiService } from '../../ai/ai.service';
import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { DiagramsService } from './diagrams.service';

function model(relationshipAttributeName: string): ConceptualModel {
  const attribute = (name: string, type: 'uuid' | 'date' = 'date') => ({
    id: name,
    name,
    type,
    identifier: name.startsWith('id_'),
    required: name.startsWith('id_'),
    unique: name.startsWith('id_'),
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  });

  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'origem', name: 'origem', attributes: [attribute('id_origem', 'uuid'), attribute('data_inicio')] },
      { id: 'destino', name: 'destino', attributes: [attribute('id_destino', 'uuid')] },
    ],
    relationships: [
      {
        id: 'associa_1',
        name: 'associa',
        type: 'N:N',
        kind: 'relationship',
        participants: [
          { entityId: 'origem', cardinality: 'N' },
          { entityId: 'destino', cardinality: 'N' },
        ],
        attributes: [attribute(relationshipAttributeName)],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

test('reenvia o modelo inválido e o conflito estruturado ao repair antes de aceitar a correção', async () => {
  const invalidModel = model('data_inicio');
  const correctedModel = model('data_inicio_associacao');
  let repairs = 0;

  const aiService = {
    generateConceptualModel: async () => invalidModel,
    fixConceptualModel: async (params: { invalidModel: ConceptualModel; validationError: unknown }) => {
      repairs += 1;
      assert.equal(params.invalidModel, invalidModel);
      assert.ok(params.validationError && typeof params.validationError === 'object');
      const repairPayload = params.validationError as {
        tree: unknown;
        repair: { duplicateRelationshipAttributes: unknown };
      };
      assert.ok(repairPayload.tree);
      assert.deepEqual(repairPayload.repair.duplicateRelationshipAttributes, [
        {
          relationship: 'associa',
          relationshipAttribute: 'data_inicio',
          participantAttributes: [{ entity: 'origem', attribute: 'data_inicio' }],
          rule: 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
        },
      ]);
      return correctedModel;
    },
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Descrição de teste.', mode: 'conceptual' });

  assert.equal(repairs, 1);
  assert.ok('relationships' in result);
  assert.equal(result.relationships[0].attributes[0].name, 'data_inicio_associacao');
});
