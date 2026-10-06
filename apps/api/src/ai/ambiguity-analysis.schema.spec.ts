import { expect, it } from 'vitest';

import { AmbiguityAnalysisSchema, normalizeAmbiguityAnalysis } from './ambiguity-analysis.schema';

function cardinalityQuestion(options: string[]) {
  return {
    id: 'cardinalidade_a_b',
    kind: 'cardinality' as const,
    participants: ['a', 'b'] as [string, string],
    text: 'Como A e B se relacionam?',
    options,
    allowsMultipleSelection: false,
    allowsCustomAnswer: true,
  };
}

it('aceita uma pergunta de cardinalidade estruturalmente ambígua e consistente', () => {
  const result = AmbiguityAnalysisSchema.safeParse({
    requiresClarification: true,
    questions: [
      cardinalityQuestion([
        'Cada A se relaciona com um B, e cada B se relaciona com um A (1:1)',
        'Um A se relaciona com vários B, e cada B se relaciona com um A (1:N)',
        'Cada A se relaciona com um B, e um B se relaciona com vários A (N:1)',
        'Um A se relaciona com vários B, e um B se relaciona com vários A (N:N)',
      ]),
    ],
  });

  expect(result.success).toBe(true);
});

it('rejeita opções duplicadas ou cardinalidades contraditórias', () => {
  const result = AmbiguityAnalysisSchema.safeParse({
    requiresClarification: true,
    questions: [
      cardinalityQuestion([
        'Cada A se relaciona com um B, e cada B se relaciona com um A (1:1)',
        'Um A se relaciona com vários B, e cada B se relaciona com um A (1:N)',
        'Um A se relaciona com vários B, e cada B se relaciona com um A (N:1)',
        'Um A se relaciona com vários B, e cada B se relaciona com vários A (N:N)',
      ]),
    ],
  });

  expect(result.success).toBe(false);
});

it('normaliza opções cardinais inconsistentes sem descartar a pergunta', () => {
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      cardinalityQuestion([
        'Cada A se relaciona com um B, e cada B se relaciona com um A (1:1)',
        'Um A se relaciona com vários B, e cada B se relaciona com um A (1:N)',
        'Um A se relaciona com vários B, e cada B se relaciona com um A (N:1)',
        'Um A se relaciona com vários B, e um B se relaciona com vários A (N:N)',
      ]),
    ],
  });

  expect(result.discardedQuestionCount).toBe(0);
  expect(result.repairedQuestionCount).toBe(1);
  expect(result.analysis.requiresClarification).toBe(true);
  expect(result.analysis.questions).toHaveLength(1);
  expect(result.analysis.questions[0]?.options[2]).toContain('(N:1)');
});

it('remove opções estruturais exatamente duplicadas sem descartar a pergunta', () => {
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      {
        id: 'atributo_endereco',
        kind: 'structural',
        text: 'Como endereço deve ser representado?',
        options: ['Como atributo simples', 'Como atributo simples', 'Como atributo composto'],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
  });

  expect(result.discardedQuestionCount).toBe(0);
  expect(result.analysis.questions[0]?.options).toEqual(['Como atributo simples', 'Como atributo composto']);
});

it('preserva uma pergunta cardinal sem participantes como esclarecimento estrutural', () => {
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      {
        id: 'cardinalidade_a_b',
        kind: 'cardinality',
        text: 'Como A e B se relacionam?',
        options: ['A com um B (1:1)', 'A com vários B (1:N)'],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
  });

  expect(result.discardedQuestionCount).toBe(0);
  expect(result.analysis.questions[0]).toMatchObject({ kind: 'structural', participants: undefined });
});

it('preserva múltiplas perguntas cardinais válidas mesmo quando uma pergunta da resposta é inválida', () => {
  const question = (id: string, first: string, second: string) => ({
    id,
    kind: 'cardinality' as const,
    participants: [first, second] as [string, string],
    text: `Como ${first} e ${second} se relacionam?`,
    options: [
      `Cada ${first} se relaciona com um ${second}, e cada ${second} se relaciona com um ${first} (1:1)`,
      `Um ${first} pode se relacionar com vários ${second}, e cada ${second} se relaciona com um ${first} (1:N)`,
      `Cada ${first} se relaciona com um ${second}, e um ${second} pode se relacionar com vários ${first} (N:1)`,
      `Um ${first} pode se relacionar com vários ${second}, e um ${second} pode se relacionar com vários ${first} (N:N)`,
    ],
    allowsMultipleSelection: false,
    allowsCustomAnswer: true,
  });
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      question('cardinalidade_funcionario_departamento', 'funcionario', 'departamento'),
      question('cardinalidade_funcionario_projeto', 'funcionario', 'projeto'),
      question('cardinalidade_projeto_departamento', 'projeto', 'departamento'),
      question('cardinalidade_cliente_projeto', 'cliente', 'projeto'),
      { id: 'invalida', kind: 'structural', options: ['Sem texto', 'Outra opção'] },
    ],
  });

  expect(result.discardedQuestionCount).toBe(1);
  expect(result.analysis.questions).toHaveLength(4);
  expect(result.analysis.questions.every((question) => question.kind === 'cardinality')).toBe(true);
});
