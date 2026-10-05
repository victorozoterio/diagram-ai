import { expect, it } from 'vitest';

import { buildConceptualModelPrompt } from './conceptual-model.prompt';

it('representa uma resposta de cardinalidade como relacionamento regular no prompt conceitual', () => {
  const prompt = buildConceptualModelPrompt({
    description: 'Pessoas colaboram com iniciativas.',
    clarifications: [
      {
        questionId: 'cardinalidade_pessoas_iniciativas',
        questionText: 'Como pessoas e iniciativas se relacionam?',
        kind: 'cardinality',
        answers: ['Cada pessoa colabora com uma iniciativa, e uma iniciativa pode ter várias pessoas (N:1)'],
      },
    ],
  });

  expect(prompt).toMatch(/CARDINALIDADE CONFIRMADA/);
  expect(prompt).toMatch(/Pergunta: Como pessoas e iniciativas se relacionam\?/);
  expect(prompt).toMatch(/represente-a em r com p/);
  expect(prompt).toMatch(/nunca cria uma entidade, atributo composto ou generalização\/especialização/);
});

it('instrui a preservar a orientação semântica de uma cardinalidade 1:N confirmada', () => {
  const prompt = buildConceptualModelPrompt({
    description: 'Uma origem possui vários destinos e cada destino pertence a uma origem.',
    clarifications: [
      {
        questionId: 'cardinalidade_origem_destino',
        questionText: 'Como origens e destinos se relacionam?',
        kind: 'cardinality',
        answers: ['Cada origem possui vários destinos, e cada destino pertence a uma única origem (1:N)'],
        cardinality: {
          participants: [
            { entity: 'origem', cardinality: '1' },
            { entity: 'destino', cardinality: 'N' },
          ],
        },
      },
    ],
  });

  expect(prompt).toContain('p=[{"e":"A","c":"1"},{"e":"B","c":"N"}]');
  expect(prompt).toContain('Nunca troque os valores 1 e N entre os participantes');
  expect(prompt).toContain('p=[{"e":"origem","c":"1"},{"e":"destino","c":"N"}]');
});
