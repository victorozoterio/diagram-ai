import type { AmbiguityQuestion } from '@/api/diagrams.api';
import { AmbiguityQuestions, CUSTOM_ANSWER } from './AmbiguityQuestions';
import styles from './EditorAssistant.module.css';

export type ClarificationStep = {
  questions: AmbiguityQuestion[];
  currentIndex: number;
  answers: Record<string, string[]>;
  customAnswers: Record<string, string>;
};

type EditorAssistantProps = {
  description: string;
  error: string | null;
  onDescriptionChange: (description: string) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  clarificationStep: ClarificationStep | null;
  onGenerate: () => void;
  onClarificationChange: (step: ClarificationStep) => void;
  onClarificationBack: () => void;
  onClarificationContinue: () => void;
};

export function EditorAssistant({
  description,
  error,
  onDescriptionChange,
  isGenerating,
  isAnalyzing,
  clarificationStep,
  onGenerate,
  onClarificationChange,
  onClarificationBack,
  onClarificationContinue,
}: EditorAssistantProps) {
  const activeQuestion = clarificationStep?.questions[clarificationStep.currentIndex];

  function updateQuestionAnswers(options: string[]) {
    if (!clarificationStep || !activeQuestion) return;
    onClarificationChange({
      ...clarificationStep,
      answers: { ...clarificationStep.answers, [activeQuestion.id]: options },
    });
  }

  function updateCustomAnswer(answer: string) {
    if (!clarificationStep || !activeQuestion) return;
    const currentAnswers = clarificationStep.answers[activeQuestion.id] ?? [];
    onClarificationChange({
      ...clarificationStep,
      answers: {
        ...clarificationStep.answers,
        [activeQuestion.id]: currentAnswers.includes(CUSTOM_ANSWER)
          ? currentAnswers
          : [...currentAnswers, CUSTOM_ANSWER],
      },
      customAnswers: { ...clarificationStep.customAnswers, [activeQuestion.id]: answer },
    });
  }

  return (
    <aside className={styles.assistant}>
      <div className={styles.heading}>
        <span className={styles.spark}>✦</span>
        <div>
          <strong>Assistente</strong>
          <span>Descreva seu modelo</span>
        </div>
      </div>
      {activeQuestion && clarificationStep ? (
        <AmbiguityQuestions
          question={activeQuestion}
          currentIndex={clarificationStep.currentIndex}
          total={clarificationStep.questions.length}
          selectedOptions={clarificationStep.answers[activeQuestion.id] ?? []}
          customAnswer={clarificationStep.customAnswers[activeQuestion.id] ?? ''}
          isSubmitting={isGenerating}
          onSelectedOptionsChange={updateQuestionAnswers}
          onCustomAnswerChange={updateCustomAnswer}
          onBack={onClarificationBack}
          onContinue={onClarificationContinue}
        />
      ) : (
        <>
          <label className={styles.label} htmlFor='description'>
            Descrição do sistema
          </label>
          <textarea
            id='description'
            className={styles.descriptionField}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={8}
          />
          <button
            className={styles.generateButton}
            type='button'
            onClick={onGenerate}
            disabled={isGenerating || isAnalyzing}
          >
            <span className={styles.generateIcon} aria-hidden='true'>
              ✦
            </span>
            {isAnalyzing ? 'Analisando...' : isGenerating ? 'Gerando...' : 'Gerar modelo'}
          </button>
        </>
      )}
      <div className={styles.feedbackArea}>{error && <p className={styles.error}>{error}</p>}</div>
    </aside>
  );
}
