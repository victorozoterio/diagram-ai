import styles from './EditorAssistant.module.css';

type EditorAssistantProps = {
  description: string;
  error: string | null;
  onDescriptionChange: (description: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
};

export function EditorAssistant({
  description,
  error,
  onDescriptionChange,
  isGenerating,
  onGenerate,
}: EditorAssistantProps) {
  return (
    <aside className={styles.assistant}>
      <div className={styles.heading}>
        <span className={styles.spark}>✦</span>
        <div>
          <strong>Assistente</strong>
          <span>Descreva seu modelo</span>
        </div>
      </div>
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
      <button className={styles.generateButton} type='button' onClick={onGenerate} disabled={isGenerating}>
        <span className={styles.generateIcon} aria-hidden='true'>
          ✦
        </span>
        {isGenerating ? 'Gerando...' : 'Gerar modelo'}
      </button>
      <div className={styles.feedbackArea}>{error && <p className={styles.error}>{error}</p>}</div>
    </aside>
  );
}
