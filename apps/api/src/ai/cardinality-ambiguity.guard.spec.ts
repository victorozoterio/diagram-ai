import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { AmbiguityAnalysis } from './ambiguity-analysis.schema';
import { discardResolvedCardinalityQuestions } from './cardinality-ambiguity.guard';

function cardinalityAnalysis(first: string, second: string): AmbiguityAnalysis {
  return {
    requiresClarification: true,
    questions: [
      {
        id: `cardinalidade_${first}_${second}`,
        text: `Como ${first} e ${second} participam dessa relação?`,
        options: ['Uma relação (1:1)', 'Uma relação (1:N)', 'Uma relação (N:1)', 'Uma relação (N:N)'],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
  };
}

test('mantém a pergunta quando nenhuma multiplicidade foi explicitada', () => {
  const result = discardResolvedCardinalityQuestions(
    'Autores escrevem livros.',
    cardinalityAnalysis('autores', 'livros'),
  );

  assert.equal(result.requiresClarification, true);
  assert.equal(result.questions.length, 1);
});

test('mantém a pergunta quando somente uma direção foi explicitada', () => {
  const result = discardResolvedCardinalityQuestions(
    'Um autor pode escrever vários livros.',
    cardinalityAnalysis('autor', 'livros'),
  );

  assert.equal(result.requiresClarification, true);
  assert.equal(result.questions.length, 1);
});

test('descarta a pergunta quando uma relação N:N já está completa', () => {
  const result = discardResolvedCardinalityQuestions(
    'Um autor pode escrever vários livros e um livro pode ser escrito por vários autores.',
    cardinalityAnalysis('autor', 'livro'),
  );

  assert.deepEqual(result, { requiresClarification: false, questions: [] });
});

test('descarta a pergunta quando uma relação 1:N já está completa', () => {
  const result = discardResolvedCardinalityQuestions(
    'Um cliente pode realizar vários pedidos e cada pedido pertence a apenas um cliente.',
    cardinalityAnalysis('cliente', 'pedido'),
  );

  assert.deepEqual(result, { requiresClarification: false, questions: [] });
});

test('descarta a pergunta para qualquer relação N:N explicitamente descrita', () => {
  const result = discardResolvedCardinalityQuestions(
    'Existem funcionários e projetos. Um funcionário pode participar de vários projetos e um projeto pode possuir vários funcionários.',
    cardinalityAnalysis('funcionarios', 'projetos'),
  );

  assert.deepEqual(result, { requiresClarification: false, questions: [] });
});
