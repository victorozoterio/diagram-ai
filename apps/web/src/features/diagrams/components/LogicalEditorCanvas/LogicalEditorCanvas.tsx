import type { LogicalModel } from '../../types';
import { LogicalModelFlow } from '../LogicalModelFlow/LogicalModelFlow';
import styles from './LogicalEditorCanvas.module.css';

type LogicalEditorCanvasProps = {
  model: LogicalModel;
  onAddTable: (position: { x: number; y: number }) => void;
};

export function LogicalEditorCanvas({ model, onAddTable }: LogicalEditorCanvasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>CANVAS</span>
          <h1>Modelo lógico</h1>
        </div>
        <span className={styles.hint}>Estrutura lógica do banco de dados</span>
      </div>
      <LogicalModelFlow model={model} onAddTable={onAddTable} />
    </section>
  );
}
