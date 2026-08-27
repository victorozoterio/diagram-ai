import type { ReactNode } from 'react';
import styles from './EditorCanvas.module.css';

type EditorCanvasProps = {
  children: ReactNode;
};

export function EditorCanvas({ children }: EditorCanvasProps) {
  return <section className={styles.canvas}>{children}</section>;
}
