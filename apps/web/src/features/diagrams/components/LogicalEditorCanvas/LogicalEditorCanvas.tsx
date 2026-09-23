import type { LogicalModel, LogicalTable } from '../../types';
import { LogicalModelFlow } from '../LogicalModelFlow/LogicalModelFlow';
import styles from './LogicalEditorCanvas.module.css';

type LogicalEditorCanvasProps = {
  model: LogicalModel;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
};

export function LogicalEditorCanvas({ model, onAddTable, onUpdateTable, onUpdateModel }: LogicalEditorCanvasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>CANVAS</span>
          <h1>Modelo lógico</h1>
        </div>
        <span className={styles.hint}>Arraste para organizar</span>
      </div>
      <LogicalModelFlow
        model={model}
        onAddTable={onAddTable}
        onUpdateTable={onUpdateTable}
        onUpdateModel={onUpdateModel}
      />
    </section>
  );
}
