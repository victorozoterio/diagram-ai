import { expect, it } from 'vitest';

import { selectedCardinalityConstraint } from './clarification-cardinality';

it('transforma a opção 1:N selecionada em uma restrição estruturada orientada', () => {
  const result = selectedCardinalityConstraint(
    {
      id: 'cardinalidade_origem_destino',
      kind: 'cardinality',
      participants: ['origem', 'destino'],
      text: 'Como origem e destino se relacionam?',
      options: [],
      allowsMultipleSelection: false,
      allowsCustomAnswer: true,
    },
    ['Uma origem possui vários destinos, e cada destino pertence a uma única origem (1:N)'],
  );

  expect(result).toEqual({
    participants: [
      { entity: 'origem', cardinality: '1' },
      { entity: 'destino', cardinality: 'N' },
    ],
  });
});
