import { expect, it } from 'vitest';

import type { AmbiguityQuestion } from '@/api/diagrams.api';
import { selectedCardinalityConstraint } from './clarification-cardinality';

const options = ['A com B (1:1)', 'A com B (1:N)', 'A com B (N:1)', 'A com B (N:N)'];

function question(first: string, second: string): AmbiguityQuestion {
  return {
    id: 'associacao',
    kind: 'cardinality',
    participants: [first, second],
    text: 'Qual é a cardinalidade?',
    options,
    optionIds: options.map((_, index) => `associacao:${index}`),
    allowsMultipleSelection: false,
    allowsCustomAnswer: true,
    optionCardinalities: options.map((_option, index) => ({
      optionIndex: index,
      cardinality: {
        participants: [
          { entity: first, cardinality: (index === 2 || index === 3 ? 'N' : '1') as '1' | 'N' },
          { entity: second, cardinality: (index === 1 || index === 3 ? 'N' : '1') as '1' | 'N' },
        ],
      },
    })),
  };
}

it.each([
  [0, '1', '1'],
  [1, '1', 'N'],
  [2, 'N', '1'],
  [3, 'N', 'N'],
] as const)('usa a decisão estruturada da opção %i sem interpretar seu texto', (index, first, second) => {
  const result = selectedCardinalityConstraint(question('origem', 'destino'), [index]);
  expect(result?.participants).toEqual([
    { entity: 'origem', cardinality: first },
    { entity: 'destino', cardinality: second },
  ]);
});

it('mantém a cardinalidade vinculada à entidade mesmo quando a ordem da pergunta muda', () => {
  const result = selectedCardinalityConstraint(question('destino', 'origem'), [2]);
  expect(result?.participants).toEqual([
    { entity: 'destino', cardinality: 'N' },
    { entity: 'origem', cardinality: '1' },
  ]);
});

it('não transforma resposta livre ou opção sem metadados em uma constraint possivelmente incorreta', () => {
  expect(selectedCardinalityConstraint(question('origem', 'destino'), [])).toBeUndefined();
});

it('não cria uma constraint a partir de uma resposta sem metadata estruturada', () => {
  const legacyQuestion = { ...question('origem', 'destino'), kind: undefined, optionCardinalities: undefined };
  expect(selectedCardinalityConstraint(legacyQuestion, [2])).toBeUndefined();
});

it('mantém a constraint por índice quando o texto da opção é normalizado para exibição', () => {
  const originalQuestion = question('funcionário', 'departamento');
  const normalizedQuestion = {
    ...question('funcionário', 'departamento'),
    options: originalQuestion.options.map((option) => option.replace(/\s*\([^)]*\)$/, '')),
  };
  expect(selectedCardinalityConstraint(normalizedQuestion, [2])?.participants).toEqual([
    { entity: 'funcionário', cardinality: 'N' },
    { entity: 'departamento', cardinality: '1' },
  ]);
});
