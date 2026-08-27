import type { ReactNode } from 'react';
import styles from './EditorAssistant.module.css';

type EditorAssistantProps = {
  description: string;
  error: string | null;
  onDescriptionChange: (description: string) => void;
  children?: ReactNode;
};

export function EditorAssistant({ description, error, onDescriptionChange, children }: EditorAssistantProps) {
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
      <p className={styles.hint}>Descreva entidades, atributos e relacionamentos para orientar o modelo.</p>
      {error && <p className={styles.error}>{error}</p>}
      {children}
    </aside>
  );
}
