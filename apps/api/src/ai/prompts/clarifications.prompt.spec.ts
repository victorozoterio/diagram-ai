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
