import { expect, it } from 'vitest';
import type { ConceptualModel, Relationship } from '../schemas/conceptual-model.schema';
import { reconcileGeneratedAssociationArtifacts } from './reconcile-generated-association-artifacts';

const attribute = (name: string, identifier = false) => ({
  id: name,
  name,
  type: identifier ? ('uuid' as const) : ('string' as const),
  identifier,
  required: identifier,
  unique: identifier,
  multivalued: false,
  composite: false,
  derived: false,
  components: [],
});

const relationship = (attributes: Relationship['attributes']): Relationship => ({
  id: 'solicita',
  name: 'solicita',
  kind: 'relationship',
  type: '1:N',
  participants: [
    { entityId: 'cliente', cardinality: '1' },
    { entityId: 'projeto', cardinality: 'N' },
  ],
  attributes,
  subtypeIds: [],
  subtypeHandles: {},
});

it('remove uma entidade artificial que apenas duplica a associação já existente', () => {
  const model: ConceptualModel = {
    metadata: {},
    entities: [
      { id: 'cliente', name: 'cliente', attributes: [attribute('id_cliente', true)] },
      { id: 'projeto', name: 'projeto', attributes: [attribute('id_projeto', true)] },
      {
        id: 'solicitacao',
        name: 'solicitacao',
        attributes: [attribute('id_solicitacao', true), attribute('cliente'), attribute('projeto')],
      },
    ],
    relationships: [relationship([])],
    standaloneAttributes: [],
    ambiguities: [],
  };

  const result = reconcileGeneratedAssociationArtifacts(model);
  expect(result.entities.map(({ name }) => name)).toEqual(['cliente', 'projeto']);
  expect(result.relationships).toEqual([relationship([])]);
});

it('remove atributos que apenas repetem a associação e seus participantes, preservando propriedades reais', () => {
  const model: ConceptualModel = {
    metadata: {},
    entities: [
      { id: 'funcionario', name: 'funcionario', attributes: [] },
      { id: 'projeto', name: 'projeto', attributes: [] },
    ],
    relationships: [
      {
        ...relationship([
          attribute('participacao_projeto'),
          attribute('participacao_funcionario'),
          attribute('data_inicio_participacao'),
        ]),
        id: 'participa_de',
        name: 'participa_de',
        type: 'N:N',
        participants: [
          { entityId: 'funcionario', cardinality: 'N' },
          { entityId: 'projeto', cardinality: 'N' },
        ],
      },
    ],
    standaloneAttributes: [],
    ambiguities: [],
  };

  const result = reconcileGeneratedAssociationArtifacts(model);
  expect(result.relationships[0].attributes.map(({ name }) => name)).toEqual(['data_inicio_participacao']);
});

it('preserva uma entidade com propriedade própria, mesmo que seu nome lembre uma associação', () => {
  const model: ConceptualModel = {
    metadata: {},
    entities: [
      { id: 'cliente', name: 'cliente', attributes: [] },
      { id: 'projeto', name: 'projeto', attributes: [] },
      {
        id: 'solicitacao',
        name: 'solicitacao',
        attributes: [
          attribute('id_solicitacao', true),
          attribute('cliente'),
          attribute('projeto'),
          attribute('status'),
        ],
      },
    ],
    relationships: [relationship([])],
    standaloneAttributes: [],
    ambiguities: [],
  };

  expect(reconcileGeneratedAssociationArtifacts(model).entities.map(({ name }) => name)).toContain('solicitacao');
});
