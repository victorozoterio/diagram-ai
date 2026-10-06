import { expect, it } from 'vitest';
import { buildClarificationAnswers } from './clarification-answers';
import type { ClarificationStep } from './components/EditorAssistant/EditorAssistant';

it('envia somente a opção selecionada e mantém a restrição cardinal mesmo após editar outra resposta', () => {
  const selected = 'Cada origem pertence a um destino, e um destino possui várias origens (N:1)';
  const step: ClarificationStep = {
    questions: [
      {
        id: 'origem_destino',
        text: 'Como origem e destino se relacionam?',
        kind: 'cardinality',
        participants: ['origem', 'destino'],
        options: [selected],
        optionIds: ['origem_destino:0'],
        optionCardinalities: [
          {
            optionIndex: 0,
            cardinality: {
              participants: [
                { entity: 'origem', cardinality: 'N' },
                { entity: 'destino', cardinality: '1' },
              ],
            },
          },
        ],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
    currentIndex: 0,
    answers: { origem_destino: ['origem_destino:0'] },
    customAnswers: { origem_destino: 'Uma resposta antiga, não selecionada.' },
  };

  expect(buildClarificationAnswers(step)).toEqual([
    {
      questionId: 'origem_destino',
      questionText: step.questions[0].text,
      kind: 'cardinality',
      answers: [selected],
      cardinality: {
        participants: [
          { entity: 'origem', cardinality: 'N' },
          { entity: 'destino', cardinality: '1' },
        ],
      },
    },
  ]);
});

it.each([
  ['1', '1'],
  ['1', 'N'],
  ['N', '1'],
  ['N', 'N'],
] as const)('envia a escolha %s:%s como participantes estruturados, não como texto interpretável', (first, second) => {
  const step: ClarificationStep = {
    questions: [
      {
        id: 'relacao',
        text: 'Como se relacionam?',
        kind: 'cardinality',
        participants: ['origem', 'destino'],
        options: ['Opção apresentada ao usuário'],
        optionIds: ['relacao:0'],
        optionCardinalities: [
          {
            optionIndex: 0,
            cardinality: {
              participants: [
                { entity: 'origem', cardinality: first },
                { entity: 'destino', cardinality: second },
              ],
            },
          },
        ],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
    currentIndex: 0,
    answers: { relacao: ['relacao:0'] },
    customAnswers: {},
  };

  expect(buildClarificationAnswers(step)[0]?.cardinality?.participants).toEqual([
    { entity: 'origem', cardinality: first },
    { entity: 'destino', cardinality: second },
  ]);
});

it('não cria constraint quando a pergunta não contém metadata estrutural confiável', () => {
  const selected =
    'Cada funcionário trabalha em um departamento, e um departamento pode possuir vários funcionários (N:1)';
  const step: ClarificationStep = {
    questions: [
      {
        id: 'trabalho',
        kind: 'cardinality',
        text: 'Como funcionários trabalham em departamentos?',
        participants: ['funcionário', 'departamento'],
        options: [selected],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
    currentIndex: 0,
    answers: { trabalho: [selected] },
    customAnswers: {},
  };

  expect(buildClarificationAnswers(step)[0]?.cardinality).toBeUndefined();
});

it('preserva a constraint estruturada mesmo se a pergunta vier com kind textual incorreto', () => {
  const step: ClarificationStep = {
    questions: [
      {
        id: 'vinculo',
        kind: 'structural',
        text: 'Como origem e destino se relacionam?',
        participants: ['origem', 'destino'],
        options: ['Uma origem e um destino possuem vários vínculos (N:N)'],
        optionIds: ['vinculo:0'],
        optionCardinalities: [
          {
            optionIndex: 0,
            cardinality: {
              participants: [
                { entity: 'origem', cardinality: 'N' },
                { entity: 'destino', cardinality: 'N' },
              ],
            },
          },
        ],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
    currentIndex: 0,
    answers: { vinculo: ['vinculo:0'] },
    customAnswers: {},
  };

  expect(buildClarificationAnswers(step)[0]).toMatchObject({
    kind: 'cardinality',
    cardinality: {
      participants: [
        { entity: 'origem', cardinality: 'N' },
        { entity: 'destino', cardinality: 'N' },
      ],
    },
  });
});

it('preserva a decisão cardinal pela identidade da opção mesmo quando seu rótulo é normalizado', () => {
  const step: ClarificationStep = {
    questions: [
      {
        id: 'trabalho',
        kind: 'cardinality',
        text: 'Como funcionários trabalham em departamentos?',
        participants: ['funcionário', 'departamento'],
        // O texto exibido pode ser normalizado, mas o identificador da opção
        // continua apontando para a decisão estrutural correta.
        options: [
          'Cada funcionário trabalha em um departamento, e cada departamento possui um funcionário',
          'Um funcionário pode trabalhar em vários departamentos, e cada departamento possui um funcionário',
          'Cada funcionário trabalha em um departamento, e um departamento pode possuir vários funcionários',
          'Um funcionário pode trabalhar em vários departamentos, e um departamento pode possuir vários funcionários',
        ],
        optionIds: ['trabalho:0', 'trabalho:1', 'trabalho:2', 'trabalho:3'],
        optionCardinalities: [
          {
            optionIndex: 0,
            cardinality: {
              participants: [
                { entity: 'funcionário', cardinality: '1' },
                { entity: 'departamento', cardinality: '1' },
              ],
            },
          },
          {
            optionIndex: 1,
            cardinality: {
              participants: [
                { entity: 'funcionário', cardinality: '1' },
                { entity: 'departamento', cardinality: 'N' },
              ],
            },
          },
          {
            optionIndex: 2,
            cardinality: {
              participants: [
                { entity: 'funcionário', cardinality: 'N' },
                { entity: 'departamento', cardinality: '1' },
              ],
            },
          },
          {
            optionIndex: 3,
            cardinality: {
              participants: [
                { entity: 'funcionário', cardinality: 'N' },
                { entity: 'departamento', cardinality: 'N' },
              ],
            },
          },
        ],
        allowsMultipleSelection: false,
        allowsCustomAnswer: true,
      },
    ],
    currentIndex: 0,
    answers: { trabalho: ['trabalho:2'] },
    customAnswers: {},
  };

  expect(buildClarificationAnswers(step)[0]).toMatchObject({
    answers: [step.questions[0].options[2]],
    cardinality: {
      participants: [
        { entity: 'funcionário', cardinality: 'N' },
        { entity: 'departamento', cardinality: '1' },
      ],
    },
  });
});
