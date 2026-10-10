import { describe, expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { applyExplicitDescriptionCardinality } from './explicit-description-cardinality';

function model(): ConceptualModel {
  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'origem', name: 'origem', attributes: [] },
      { id: 'destino', name: 'destino', attributes: [] },
    ],
    relationships: [
      {
        id: 'associa',
        name: 'associa',
        kind: 'relationship',
        type: '1:1',
        participants: [
          { entityId: 'origem', cardinality: '1' },
          { entityId: 'destino', cardinality: '1' },
        ],
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

describe('cardinalidades explícitas da descrição', () => {
  it.each([
    ['1:1', 'Uma origem se relaciona com um destino, e um destino se relaciona com uma origem.', '1', '1'],
    ['1:N', 'Uma origem pode realizar vários destinos, e cada destino pertence a uma origem.', '1', 'N'],
    ['N:1', 'Cada origem pertence a um destino, e um destino pode possuir várias origens.', 'N', '1'],
    ['N:N', 'Uma origem pode incluir vários destinos, e um destino pode incluir várias origens.', 'N', 'N'],
  ] as const)('preserva %s por participante, mesmo quando a IA devolve 1:1', (_, description, first, second) => {
    const result = applyExplicitDescriptionCardinality(model(), description);

    expect(result.relationships[0].type).toBe(`${first}:${second}`.split(':').sort().join(':'));
    expect(result.relationships[0].participants).toEqual([
      { entityId: 'origem', cardinality: first },
      { entityId: 'destino', cardinality: second },
    ]);
  });

  it('não infere o lado inverso quando o texto informa somente uma direção', () => {
    const initial = model();
    initial.relationships[0].participants[1].cardinality = 'N';
    initial.relationships[0].type = '1:N';

    expect(applyExplicitDescriptionCardinality(initial, 'Uma origem pode realizar vários destinos.')).toEqual(initial);
  });
});
