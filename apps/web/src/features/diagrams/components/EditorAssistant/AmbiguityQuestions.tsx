import { useEffect, useRef } from 'react';
import type { AmbiguityQuestion } from '@/api/diagrams.api';
import styles from './EditorAssistant.module.css';

type AmbiguityQuestionsProps = {
  question: AmbiguityQuestion;
  currentIndex: number;
  total: number;
  selectedOptions: string[];
  customAnswer: string;
  isSubmitting: boolean;
  onSelectedOptionsChange: (options: string[]) => void;
  onCustomAnswerChange: (answer: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

const CUSTOM_ANSWER = '__custom_answer__';

export function AmbiguityQuestions({
  question,
  currentIndex,
  total,
  selectedOptions,
  customAnswer,
  isSubmitting,
  onSelectedOptionsChange,
  onCustomAnswerChange,
  onBack,
  onContinue,
}: AmbiguityQuestionsProps) {
  const customAnswerFieldRef = useRef<HTMLTextAreaElement>(null);
  const customSelected = selectedOptions.includes(CUSTOM_ANSWER);
  const canContinue = customSelected
    ? customAnswer.trim().length > 0
    : selectedOptions.some((option) => option !== CUSTOM_ANSWER);

  useEffect(() => {
    if (customSelected) customAnswerFieldRef.current?.focus();
  }, [customSelected]);

  function toggleOption(option: string) {
    if (question.allowsMultipleSelection) {
      onSelectedOptionsChange(
        selectedOptions.includes(option)
          ? selectedOptions.filter((selectedOption) => selectedOption !== option)
          : [...selectedOptions, option],
      );
      return;
    }

    onSelectedOptionsChange([option]);
  }

  function toggleCustomAnswer() {
    if (question.allowsMultipleSelection) {
      onSelectedOptionsChange(
        customSelected
          ? selectedOptions.filter((option) => option !== CUSTOM_ANSWER)
          : [...selectedOptions, CUSTOM_ANSWER],
      );
      return;
    }

    onSelectedOptionsChange([CUSTOM_ANSWER]);
  }

  return (
    <section className={styles.questionnaire} aria-live='polite'>
      <span className={styles.progress}>
        {currentIndex + 1} de {total}
      </span>
      <h2>{question.text}</h2>
      <div className={styles.options}>
        {question.options.map((option, index) => {
          const optionId = question.optionIds?.[index] ?? option;
          const selected = selectedOptions.includes(optionId);
          return (
            <button
              className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
              type='button'
              key={optionId}
              aria-pressed={selected}
              onClick={() => toggleOption(optionId)}
            >
              <span className={styles.optionIndicator} aria-hidden='true' />
              {option}
            </button>
          );
        })}
        {question.allowsCustomAnswer && (
          <div className={`${styles.customAnswer} ${customSelected ? styles.customAnswerSelected : ''}`}>
            <button
              className={styles.customAnswerToggle}
              type='button'
              aria-pressed={customSelected}
              onClick={toggleCustomAnswer}
            >
              <span className={styles.optionIndicator} aria-hidden='true' />
              Outra resposta
            </button>
            {customSelected && (
              <textarea
                ref={customAnswerFieldRef}
                className={styles.customAnswerField}
                value={customAnswer}
                placeholder='Descreva sua resposta...'
                rows={2}
                onChange={(event) => onCustomAnswerChange(event.target.value)}
              />
            )}
          </div>
        )}
      </div>
      <div className={styles.questionActions}>
        <button className={styles.backButton} type='button' onClick={onBack}>
          Voltar
        </button>
        <button
          className={styles.continueButton}
          type='button'
          disabled={!canContinue || isSubmitting}
          onClick={onContinue}
        >
          {isSubmitting ? 'Gerando...' : currentIndex === total - 1 ? 'Gerar modelo' : 'Continuar'}
        </button>
      </div>
    </section>
  );
}

export { CUSTOM_ANSWER };
