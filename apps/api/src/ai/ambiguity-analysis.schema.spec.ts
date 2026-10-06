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
  expect(result.analysis.questions[0]?.optionIds).toEqual([
    'cardinalidade_a_b:0',
    'cardinalidade_a_b:1',
    'cardinalidade_a_b:2',
    'cardinalidade_a_b:3',
  ]);
  expect(result.analysis.questions[0]?.optionCardinalities?.[2]?.cardinality.participants).toEqual([
    { entity: 'a', cardinality: 'N' },
    { entity: 'b', cardinality: '1' },
  ]);
});

it('anexa uma decisão N:1 orientada aos participantes após validar as opções em português', () => {
  const selected = 'Cada funcionário trabalha em um departamento, e um departamento pode ter vários funcionários (N:1)';
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      {
        id: 'trabalho',
        kind: 'cardinality',
        participants: ['funcionário', 'departamento'],
        text: 'Como se distribuem funcionários e departamentos?',
        options: [
          'Cada funcionário trabalha em um departamento, e cada departamento tem um funcionário (1:1)',
          'Um funcionário pode trabalhar em vários departamentos, e cada departamento tem um funcionário (1:N)',
          selected,
          'Um funcionário pode trabalhar em vários departamentos, e um departamento pode ter vários funcionários (N:N)',
        ],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
  });

  expect(result.analysis.questions[0]?.kind).toBe('cardinality');
  expect(
    result.analysis.questions[0]?.optionCardinalities?.find(({ optionIndex }) => optionIndex === 2)?.cardinality,
  ).toEqual({
    participants: [
      { entity: 'funcionário', cardinality: 'N' },
      { entity: 'departamento', cardinality: '1' },
    ],
  });
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

it('descarta pergunta cardinal sem participantes em vez de enviar uma escolha apenas textual', () => {
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

  expect(result.discardedQuestionCount).toBe(1);
  expect(result.analysis.questions).toEqual([]);
});

it('promove opções de cardinalidade com participantes a escolhas estruturadas mesmo se a IA omitir kind', () => {
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      {
        ...cardinalityQuestion([
          'Cada A se relaciona com um B, e cada B se relaciona com um A (1:1)',
          'Um A se relaciona com vários B, e cada B se relaciona com um A (1:N)',
          'Cada A se relaciona com um B, e um B se relaciona com vários A (N:1)',
          'Um A se relaciona com vários B, e um B se relaciona com vários A (N:N)',
        ]),
        kind: 'structural',
      },
    ],
  });

  expect(result.analysis.questions[0]?.kind).toBe('cardinality');
  expect(result.analysis.questions[0]?.optionCardinalities?.[2]?.cardinality.participants).toEqual([
    { entity: 'a', cardinality: 'N' },
    { entity: 'b', cardinality: '1' },
  ]);
});

it('recupera participantes ausentes de uma resposta no contrato antigo antes de devolver perguntas ao frontend', () => {
  const question = (id: string, text: string, first: string, second: string) => ({
    id,
    text,
    kind: 'cardinality' as const,
    options: [
      `Cada ${first} se relaciona com um ${second}, e cada ${second} possui um ${first} (1:1)`,
      `Um ${first} pode se relacionar com vários ${second}, e cada ${second} possui um ${first} (1:N)`,
      `Cada ${first} se relaciona com um ${second}, e um ${second} pode possuir vários ${first} (N:1)`,
      `Um ${first} pode se relacionar com vários ${second}, e um ${second} pode possuir vários ${first} (N:N)`,
    ],
    allowsMultipleSelection: false,
    allowsCustomAnswer: true,
  });

  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [
      question(
        'cardinalidade_funcionario_departamento',
        'Como funcionários e departamentos se relacionam?',
        'funcionário',
        'departamento',
      ),
      question(
        'cardinalidade_funcionario_projeto',
        'Como funcionários e projetos se relacionam?',
        'funcionário',
        'projeto',
      ),
      question(
        'cardinalidade_projeto_departamento',
        'Como projetos e departamentos se relacionam?',
        'projeto',
        'departamento',
      ),
      question('cardinalidade_cliente_projeto', 'Como clientes e projetos se relacionam?', 'cliente', 'projeto'),
    ],
  });

  expect(result.discardedQuestionCount).toBe(0);
  expect(result.repairedQuestionCount).toBe(4);
  expect(result.analysis.questions).toHaveLength(4);
  expect(result.analysis.questions.every((item) => item.participants?.length === 2)).toBe(true);
  expect(result.analysis.questions.every((item) => item.optionCardinalities?.length === 4)).toBe(true);
  expect(result.analysis.questions.map((item) => item.participants)).toEqual([
    ['funcionário', 'departamento'],
    ['funcionário', 'projeto'],
    ['projeto', 'departamento'],
    ['cliente', 'projeto'],
  ]);
});

it('não rebaixa para estrutural uma pergunta cardinal com participantes e opções sem rótulo confiável', () => {
  const result = normalizeAmbiguityAnalysis({
    requiresClarification: true,
    questions: [cardinalityQuestion(['Um A pode ter vários B', 'A e B podem ter vários vínculos'])],
  });
  expect(result.analysis.questions[0]?.kind).toBe('cardinality');
  expect(result.analysis.questions[0]?.optionCardinalities).toHaveLength(4);
  expect(result.analysis.questions[0]?.optionCardinalities?.[2]?.cardinality.participants).toEqual([
    { entity: 'a', cardinality: 'N' },
    { entity: 'b', cardinality: '1' },
  ]);
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
