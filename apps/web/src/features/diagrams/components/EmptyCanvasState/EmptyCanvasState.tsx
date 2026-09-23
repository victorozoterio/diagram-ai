import styles from './EmptyCanvasState.module.css';

type EmptyCanvasStateProps = {
  description: string;
};

export function EmptyCanvasState({ description }: EmptyCanvasStateProps) {
  return (
    <div className={styles.emptyCanvas}>
      <span className={styles.emptyIcon}>⌘</span>
      <h1>Seu modelo começa aqui</h1>
      <p>{description}</p>
    </div>
  );
}
