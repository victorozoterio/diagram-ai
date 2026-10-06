import type { AmbiguityQuestion, ClarificationAnswer } from '@/api/diagrams.api';

export function selectedCardinalityConstraint(
  question: AmbiguityQuestion,
  selectedOptionIndexes: number[],
): ClarificationAnswer['cardinality'] | undefined {
  // A metadata estrutural é a fonte de verdade. Assim, uma classificação
  // textual incorreta da pergunta não pode transformar a escolha em texto.
  if (selectedOptionIndexes.length !== 1) return undefined;
  return question.optionCardinalities?.find(({ optionIndex }) => optionIndex === selectedOptionIndexes[0])?.cardinality;
}

export function optionIndexForSelection(question: AmbiguityQuestion, selectedOptionId: string): number | undefined {
  const identifiedIndex = question.optionIds?.indexOf(selectedOptionId) ?? -1;
  if (identifiedIndex >= 0) return identifiedIndex;

  const matchingIndexes = question.options.flatMap((option, index) => (option === selectedOptionId ? [index] : []));
  return matchingIndexes.length === 1 ? matchingIndexes[0] : undefined;
}
