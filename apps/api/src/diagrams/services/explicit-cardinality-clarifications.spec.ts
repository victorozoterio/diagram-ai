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
