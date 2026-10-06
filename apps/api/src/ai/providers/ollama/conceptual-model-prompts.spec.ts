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

it('orienta o reparo a remover somente o atributo sem evidência da associação', () => {
  const prompt = buildFixConceptualModelPrompt({
    description: 'Uma origem se relaciona com um destino.',
    invalidModel: { r: [{ n: 'associa', a: [{ n: 'data_registro' }] }] },
    validationError: {
      unsupportedRelationshipAttributes: [
        { relationship: 'associa', attribute: 'data_registro', participants: ['origem', 'destino'] },
      ],
    },
  });

  expect(prompt).toContain('O atributo "data_registro" em "associa" não tem evidência nessa associação');
  expect(prompt).toContain('Remova-o desse relacionamento');
  expect(prompt).toContain('Preserve todos os elementos não envolvidos');
});

it('identifica o atributo composto inválido no contexto enviado ao reparo', () => {
  const model = invalidModel();
  model.entities[0].attributes[1] = {
    ...model.entities[0].attributes[1],
    id: 'endereco',
    name: 'endereco',
    composite: true,
    components: [],
  };
  model.relationships[0].attributes = [];
  const validation = ConceptualModelSchema.safeParse(model);

  expect(validation.success).toBe(false);
  if (validation.success) return;

  const prompt = buildFixConceptualModelPrompt({
    description: 'Uma origem possui um endereço.',
    invalidModel: model,
    validationError: {
      tree: validation.error.format(),
      repair: buildConceptualModelRepairContext(model, validation.error),
    },
  });

  expect(prompt).toContain('O atributo "endereco" (id "endereco") em entity "origem" viola a composição');
  expect(prompt).toContain('composite=true');
  expect(prompt).toContain('components=[]');
  expect(prompt).toContain('nunca invente componentes por causa do nome do atributo');
});

it('orienta o reparo de atributo que representa outra entidade e de dado da associação', () => {
  const prompt = buildFixConceptualModelPrompt({
    description: 'Duas entidades participam de uma associação com um dado por ocorrência.',
    invalidModel: { e: [], r: [] },
    validationError: {
      misplacedEntityAttributes: [
        {
          entity: 'origem',
          attribute: 'destino',
          relationship: 'associa',
          participants: ['origem', 'destino'],
          reason: 'entity-used-as-attribute',
          evidence: 'destino já é entidade participante de associa.',
        },
        {
          entity: 'origem',
          attribute: 'data_inicio_associacao',
          relationship: 'associa',
          participants: ['origem', 'destino'],
          reason: 'association-attribute-in-entity',
          evidence: 'Para cada associação de uma origem em um destino, registrar data de início.',
        },
      ],
    },
  });

  expect(prompt).toContain('Remova o atributo "destino" de e[].a da entidade "origem"');
  expect(prompt).toContain('Mova "data_inicio_associacao" de e[].a da entidade "origem" para r[].a');
  expect(prompt).toContain('Preserve os atributos próprios da entidade');
});
