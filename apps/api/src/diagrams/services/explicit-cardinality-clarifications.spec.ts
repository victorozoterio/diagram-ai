import { expect, it } from 'vitest';

import type { ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { applyExplicitCardinalityClarifications } from './explicit-cardinality-clarifications';

function model(firstCardinality: '1' | 'N', secondCardinality: '1' | 'N'): ConceptualModel {
  return {
    metadata: {},
    entities: [
      { id: 'origem', name: 'origem', attributes: [] },
      { id: 'destino', name: 'destino', attributes: [] },
    ],
    standaloneAttributes: [],
    ambiguities: [],
    relationships: [
      {
        id: 'associa',
        name: 'associa',
        type: '1:N',
        kind: 'relationship',
        participants: [
          { entityId: 'origem', cardinality: firstCardinality },
          { entityId: 'destino', cardinality: secondCardinality },
        ],
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

function clarification(firstCardinality: '1' | 'N', secondCardinality: '1' | 'N'): ClarificationAnswer[] {
  return [
    {
      questionId: 'cardinalidade_origem_destino',
      kind: 'cardinality',
      answers: ['Uma resposta selecionada pelo usuário.'],
      cardinality: {
        participants: [
          { entity: 'origem', cardinality: firstCardinality },
          { entity: 'destino', cardinality: secondCardinality },
        ],
      },
    },
  ];
}

it('aplica uma clarificação 1:N à relação gerada, mesmo se a IA a inverter', () => {
  const result = applyExplicitCardinalityClarifications(model('N', '1'), clarification('1', 'N'));

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: '1' },
    { entityId: 'destino', cardinality: 'N' },
  ]);
});

it('mantém a orientação N:1 confirmada no sentido inverso', () => {
  const result = applyExplicitCardinalityClarifications(model('1', 'N'), clarification('N', '1'));

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: 'N' },
    { entityId: 'destino', cardinality: '1' },
  ]);
});

it('corrige N:1 para a entidade mencionada primeiro no esclarecimento, sem depender do sentido da edge', () => {
  const generated = model('1', 'N');
  generated.entities = [
    { id: 'funcionario', name: 'funcionário', attributes: [] },
    { id: 'departamento', name: 'departamento', attributes: [] },
  ];
  generated.relationships[0] = {
    ...generated.relationships[0],
    name: 'trabalha_em',
    participants: [
      { entityId: 'departamento', cardinality: 'N' },
      { entityId: 'funcionario', cardinality: '1' },
    ],
  };

  const result = applyExplicitCardinalityClarifications(generated, [
    {
      questionId: 'trabalho',
      kind: 'cardinality',
      answers: [
        'Cada funcionário trabalha em um departamento, e um departamento pode possuir vários funcionários (N:1)',
      ],
      cardinality: {
        participants: [
          { entity: 'funcionário', cardinality: 'N' },
          { entity: 'departamento', cardinality: '1' },
        ],
      },
    },
  ]);

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'departamento', cardinality: '1' },
    { entityId: 'funcionario', cardinality: 'N' },
  ]);
});

it('reconhece o participante pelo mesmo conceito quando o esclarecimento usa plural', () => {
  const result = applyExplicitCardinalityClarifications(model('1', 'N'), [
    {
      questionId: 'cardinalidade',
      answers: ['Cada origem pertence a um destino, e um destino possui várias origens (N:1)'],
      cardinality: {
        participants: [
          { entity: 'origens', cardinality: 'N' },
          { entity: 'destino', cardinality: '1' },
        ],
      },
    },
  ]);

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: 'N' },
    { entityId: 'destino', cardinality: '1' },
  ]);
});

it.each([
  { first: '1' as const, second: '1' as const, type: '1:1' },
  { first: 'N' as const, second: 'N' as const, type: 'N:N' },
])('preserva a restrição $type sem inverter os participantes', ({ first, second, type }) => {
  const result = applyExplicitCardinalityClarifications(model('1', 'N'), clarification(first, second));

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].type).toBe(type);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: first },
    { entityId: 'destino', cardinality: second },
  ]);
});

it('mantém a cardinalidade vinculada ao entityId quando a IA inverte a ordem dos participantes', () => {
  const reversed = model('1', 'N');
  reversed.relationships[0].participants.reverse();
  const result = applyExplicitCardinalityClarifications(reversed, clarification('N', '1'));

  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'destino', cardinality: '1' },
    { entityId: 'origem', cardinality: 'N' },
  ]);
});

it.each([
  ['1', '1'],
  ['1', 'N'],
  ['N', '1'],
  ['N', 'N'],
] as const)('aplica %s:%s por entidade mesmo com a ordem invertida pela IA', (first, second) => {
  const generated = model(second, first);
  generated.relationships[0].participants.reverse();
  const result = applyExplicitCardinalityClarifications(generated, clarification(first, second));

  expect(result.unresolved).toEqual([]);
  expect(result.model.relationships[0].participants).toEqual([
    { entityId: 'destino', cardinality: second },
    { entityId: 'origem', cardinality: first },
  ]);
});

it('não altera relações que não têm esclarecimento', () => {
  const original = model('1', 'N');
  const unrelated = {
    ...original.relationships[0],
    id: 'outra',
    participants: [
      { entityId: 'origem', cardinality: 'N' as const },
      { entityId: 'terceira', cardinality: '1' as const },
    ],
  };
  original.entities.push({ id: 'terceira', name: 'terceira', attributes: [] });
  original.relationships.push(unrelated);

  const result = applyExplicitCardinalityClarifications(original, clarification('N', '1'));
  expect(result.model.relationships[1]).toBe(unrelated);
});
