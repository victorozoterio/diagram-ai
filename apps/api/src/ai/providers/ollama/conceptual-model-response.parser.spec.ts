import { expect, it } from 'vitest';

import { parseConceptualModelResponse } from './conceptual-model-response.parser';

function relationshipParticipants(content: Record<string, unknown>) {
  const model = parseConceptualModelResponse(JSON.stringify(content));
  return model.relationships[0].participants;
}

it('preserva a orientação 1:N recebida para os participantes do relacionamento', () => {
  const participants = relationshipParticipants({
    e: [{ n: 'origem' }, { n: 'destino' }],
    r: [
      {
        n: 'associa',
        p: [
          { e: 'origem', c: '1' },
          { e: 'destino', c: 'N' },
        ],
      },
    ],
  });

  expect(participants).toEqual([
    { entityId: 'origem', cardinality: '1' },
    { entityId: 'destino', cardinality: 'N' },
  ]);
});

it('preserva a orientação N:1 recebida no sentido inverso', () => {
  const participants = relationshipParticipants({
    e: [{ n: 'origem' }, { n: 'destino' }],
    r: [
      {
        n: 'associa',
        p: [
          { e: 'origem', c: 'N' },
          { e: 'destino', c: '1' },
        ],
      },
    ],
  });

  expect(participants).toEqual([
    { entityId: 'origem', cardinality: 'N' },
    { entityId: 'destino', cardinality: '1' },
  ]);
});

it('expõe a flag composta sem componentes para a normalização estrutural posterior', () => {
  const model = parseConceptualModelResponse(
    JSON.stringify({
      e: [{ n: 'origem', a: [{ n: 'endereco', t: 's', f: ['c'] }] }],
      r: [],
    }),
  );

  expect(model.entities[0]?.attributes.find(({ name }) => name === 'endereco')).toMatchObject({
    composite: true,
    components: [],
  });
});
