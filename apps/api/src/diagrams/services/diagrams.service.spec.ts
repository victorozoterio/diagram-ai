import { expect, it, vi } from 'vitest';

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

it('reenvia o modelo inválido e o conflito estruturado ao repair antes de aceitar a correção', async () => {
  const invalidModel = model('data_inicio');
  const correctedModel = model('data_inicio_associacao');
  const fixConceptualModel = vi.fn(async (params: { invalidModel: ConceptualModel; validationError: unknown }) => {
    expect(params.invalidModel).toBe(invalidModel);
    expect(params.validationError && typeof params.validationError === 'object').toBe(true);
    const repairPayload = params.validationError as {
      tree: unknown;
      repair: { duplicateRelationshipAttributes: unknown };
    };
    expect(repairPayload.tree).toBeDefined();
    expect(repairPayload.repair.duplicateRelationshipAttributes).toEqual([
      {
        relationship: 'associa',
        relationshipAttribute: 'data_inicio',
        participantAttributes: [{ entity: 'origem', attribute: 'data_inicio' }],
        rule: 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
      },
    ]);
    return correctedModel;
  });
  const aiService = {
    generateConceptualModel: vi.fn(async () => invalidModel),
    fixConceptualModel,
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Descrição de teste.', mode: 'conceptual' });

  expect(fixConceptualModel).toHaveBeenCalledTimes(1);
  if (!('relationships' in result)) {
    throw new Error('O modelo corrigido deveria conter relacionamentos.');
  }
  expect(result.relationships[0].attributes[0].name).toBe('data_inicio_associacao');
});

it('repara a resposta lógica inválida antes de devolver o modelo normalizado', async () => {
  const invalidModel = {
    tables: [],
    oneToMany: [],
    oneToOne: [],
    manyToMany: [],
    constraints: { unique: [], notNull: [] },
  };
  const correctedModel = {
    tables: [
      {
        name: 'cliente',
        columns: [{ name: 'id_cliente', type: 'uuid', primaryKey: true }],
      },
    ],
    oneToMany: [],
    oneToOne: [],
    manyToMany: [],
    constraints: { unique: [], notNull: [] },
  };
  const fixLogicalModel = vi.fn(async (params: { invalidModel: unknown; validationError: unknown }) => {
    expect(params.invalidModel).toBe(invalidModel);
    expect(params.validationError && typeof params.validationError === 'object').toBe(true);
    expect(String((params.validationError as { message?: string }).message)).toMatch(/modelo lógico/i);
    return correctedModel;
  });
  const aiService = {
    generateLogicalModel: vi.fn(async () => invalidModel),
    fixLogicalModel,
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Cada cliente possui um cadastro.', mode: 'logical' });

  expect(fixLogicalModel).toHaveBeenCalledTimes(1);
  if (!('tables' in result)) {
    throw new Error('O modelo corrigido deveria conter tabelas.');
  }
  expect(result.tables[0].name).toBe('cliente');
});
