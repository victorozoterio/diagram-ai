import { expect, it } from 'vitest';
import { type ConceptualModel, ConceptualModelSchema } from '../../../diagrams/schemas/conceptual-model.schema';
import { buildConceptualModelRepairContext } from '../../../diagrams/services/conceptual-model-repair-context';
import { buildFixConceptualModelPrompt } from './conceptual-model-prompts';

function invalidModel(): ConceptualModel {
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
        attributes: [attribute('data_inicio')],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

it('o repair recebe o modelo inválido e o conflito de atributo identificado', () => {
  const model = invalidModel();
  const validation = ConceptualModelSchema.safeParse(model);

  expect(validation.success).toBe(false);
  if (validation.success) return;

  const prompt = buildFixConceptualModelPrompt({
    description: 'Uma origem e um destino possuem fatos de início distintos.',
    invalidModel: model,
    validationError: {
      tree: validation.error.format(),
      repair: buildConceptualModelRepairContext(model, validation.error),
    },
  });

  expect(prompt).toMatch(/MODELO INVÁLIDO/);
  expect(prompt).toMatch(/"data_inicio"/);
  expect(prompt).toMatch(/No relacionamento "associa", o atributo "data_inicio" conflita com origem\.data_inicio/);
  expect(prompt).toMatch(/renomeie somente o atributo do relacionamento/);
});
