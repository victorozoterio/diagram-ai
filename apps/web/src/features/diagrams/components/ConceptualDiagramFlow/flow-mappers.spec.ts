import { expect, it } from 'vitest';

import type { ConceptualModel } from '../../types';
import type { RelationshipEdgeData } from './flow.types';
import { buildFlowEdges } from './flow-mappers';
import { relationshipCardinalityForEntity } from './relationship-cardinality';

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

function mappedCardinalities(modelToMap: ConceptualModel) {
  return buildFlowEdges(modelToMap, {}, {})
    .map((edge) => edge.data as RelationshipEdgeData)
    .map((data) => [data.entityId, relationshipCardinalityForEntity(data.relationship, data.entityId)] as const);
}

it('mantém 1 no participante A e N no participante B ao mapear 1:N para React Flow', () => {
  expect(mappedCardinalities(model('1', 'N'))).toEqual([
    ['origem', '1'],
    ['destino', 'N'],
  ]);
});

it('mantém N no participante A e 1 no participante B ao mapear N:1 para React Flow', () => {
  expect(mappedCardinalities(model('N', '1'))).toEqual([
    ['origem', 'N'],
    ['destino', '1'],
  ]);
});

it('renderiza N junto da primeira entidade mesmo quando ela é target da edge', () => {
  const reversed = model('N', '1');
  reversed.relationships[0].participants.reverse();
  expect(mappedCardinalities(reversed)).toEqual([
    ['destino', '1'],
    ['origem', 'N'],
  ]);
});
