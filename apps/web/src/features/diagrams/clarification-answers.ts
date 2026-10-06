import type { ClarificationAnswer } from '@/api/diagrams.api';
import { optionIndexForSelection, selectedCardinalityConstraint } from './clarification-cardinality';
import { CUSTOM_ANSWER } from './components/EditorAssistant/AmbiguityQuestions';
import type { ClarificationStep } from './components/EditorAssistant/EditorAssistant';

export function buildClarificationAnswers(step: ClarificationStep): ClarificationAnswer[] {
  return step.questions.flatMap((question) => {
    const selectedAnswers = step.answers[question.id] ?? [];
    const customAnswer = step.customAnswers[question.id]?.trim();
    const selectedOptionIndexes = selectedAnswers
      .filter((answer) => answer !== CUSTOM_ANSWER)
      .flatMap((answer) => {
        const optionIndex = optionIndexForSelection(question, answer);
        return optionIndex === undefined ? [] : [optionIndex];
      });
    const answers = selectedOptionIndexes
      .map((optionIndex) => question.options[optionIndex])
      .filter((answer): answer is string => Boolean(answer))
      .concat(selectedAnswers.includes(CUSTOM_ANSWER) && customAnswer ? [customAnswer] : []);
    if (answers.length === 0) return [];

    const cardinality = selectedCardinalityConstraint(question, selectedOptionIndexes);
    return [
      {
        questionId: question.id,
        questionText: question.text,
        kind: cardinality ? 'cardinality' : question.kind,
        answers,
        ...(cardinality ? { cardinality } : {}),
      },
    ];
  });
}
