import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildConceptualModelPrompt } from './conceptual-model.prompt';

test('representa uma resposta de cardinalidade como relacionamento regular no prompt conceitual', () => {
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

  assert.match(prompt, /CARDINALIDADE CONFIRMADA/);
  assert.match(prompt, /Pergunta: Como pessoas e iniciativas se relacionam\?/);
  assert.match(prompt, /represente-a em r com p/);
  assert.match(prompt, /nunca cria uma entidade, atributo composto ou generalização\/especialização/);
});
