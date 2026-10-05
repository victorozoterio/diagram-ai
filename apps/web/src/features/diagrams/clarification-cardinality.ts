import type { AmbiguityQuestion, ClarificationAnswer } from '@/api/diagrams.api';

export function selectedCardinalityConstraint(
  question: AmbiguityQuestion,
  answers: string[],
): ClarificationAnswer['cardinality'] | undefined {
  if (question.kind !== 'cardinality' || !question.participants || answers.length !== 1) return undefined;

  const notation = answers[0].match(/\((1:1|1:N|N:1|N:N)\)\s*$/i)?.[1]?.toUpperCase();
  if (!notation) return undefined;

  const [firstCardinality, secondCardinality] = notation.split(':') as ['1' | 'N', '1' | 'N'];
  const [firstEntity, secondEntity] = question.participants;

  return {
    participants: [
      { entity: firstEntity, cardinality: firstCardinality },
      { entity: secondEntity, cardinality: secondCardinality },
    ],
  };
}
