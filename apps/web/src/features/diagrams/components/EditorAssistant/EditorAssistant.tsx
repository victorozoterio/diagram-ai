import { useEffect, useRef, useState } from 'react';
import { FiMic, FiSquare, FiX } from 'react-icons/fi';
import { type AmbiguityQuestion, transcribeAudio } from '@/api/diagrams.api';
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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      discardRecordingRef.current = true;
      if (recorder?.state === 'recording') recorder.stop();
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    };
  }, []);

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

  async function startRecording() {
    if (isRecording || isTranscribing) return;

    setVoiceError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('A gravação de áudio não é compatível com este navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRecordingRef.current = false;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);

        if (discardRecordingRef.current) return;

        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size) {
          setVoiceError('Nenhum áudio foi gravado. Tente novamente.');
          return;
        }

        void transcribeRecording(audio);
      });
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setVoiceError('Permissão para usar o microfone foi negada.');
        return;
      }

      setVoiceError('Não foi possível iniciar a gravação. Tente novamente.');
    }
  }

  function stopRecording(discard = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    discardRecordingRef.current = discard;
    recorder.stop();
  }

  async function transcribeRecording(audio: Blob) {
    setIsTranscribing(true);
    setVoiceError(null);

    try {
      onDescriptionChange(await transcribeAudio(audio));
    } catch {
      setVoiceError('Não foi possível transcrever o áudio. Tente novamente.');
    } finally {
      setIsTranscribing(false);
    }
  }

  const feedback = error ?? voiceError;

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
          <div className={styles.descriptionInput}>
            <textarea
              id='description'
              className={styles.descriptionField}
              value={description}
              onChange={(event) => {
                setVoiceError(null);
                onDescriptionChange(event.target.value);
              }}
              rows={8}
            />
            <div className={styles.voiceControls}>
              <button
                aria-label={isRecording ? 'Parar gravação' : 'Gravar descrição por voz'}
                className={`${styles.voiceButton} ${isRecording ? styles.voiceButtonRecording : ''}`}
                disabled={isGenerating || isAnalyzing || isTranscribing}
                onClick={() => (isRecording ? stopRecording() : void startRecording())}
                title={isRecording ? 'Parar gravação' : 'Gravar descrição por voz'}
                type='button'
              >
                {isRecording ? <FiSquare aria-hidden='true' /> : <FiMic aria-hidden='true' />}
                <span>{isRecording ? 'Parar' : isTranscribing ? 'Transcrevendo...' : 'Gravar'}</span>
              </button>
              {isRecording && (
                <button
                  aria-label='Cancelar gravação'
                  className={styles.cancelRecordingButton}
                  onClick={() => stopRecording(true)}
                  title='Cancelar gravação'
                  type='button'
                >
                  <FiX aria-hidden='true' />
                  <span>Cancelar</span>
                </button>
              )}
              {isRecording && <span className={styles.recordingStatus}>Gravando...</span>}
            </div>
          </div>
          <button
            className={styles.generateButton}
            type='button'
            onClick={onGenerate}
            disabled={isGenerating || isAnalyzing || isRecording || isTranscribing}
          >
            <span className={styles.generateIcon} aria-hidden='true'>
              ✦
            </span>
            {isAnalyzing ? 'Analisando...' : isGenerating ? 'Gerando...' : 'Gerar modelo'}
          </button>
        </>
      )}
      <div className={styles.feedbackArea}>{feedback && <p className={styles.error}>{feedback}</p>}</div>
    </aside>
  );
}
