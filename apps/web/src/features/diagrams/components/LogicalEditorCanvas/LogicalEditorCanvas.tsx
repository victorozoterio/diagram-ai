import type { LogicalModel, LogicalTable } from '../../types';
import { EmptyCanvasState } from '../EmptyCanvasState/EmptyCanvasState';
import { LogicalModelFlow } from '../LogicalModelFlow/LogicalModelFlow';
import styles from './LogicalEditorCanvas.module.css';

type LogicalEditorCanvasProps = {
  model: LogicalModel;
  exportMenuTarget?: Element | null;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
};

export function LogicalEditorCanvas({
  model,
  exportMenuTarget,
  onAddTable,
  onUpdateTable,
  onUpdateModel,
}: LogicalEditorCanvasProps) {
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
        exportMenuTarget={exportMenuTarget}
        onAddTable={onAddTable}
        onUpdateTable={onUpdateTable}
        onUpdateModel={onUpdateModel}
      />
      {model.tables.length === 0 && (
        <EmptyCanvasState description='Gere um modelo ou arraste um elemento da biblioteca para começar.' />
      )}
    </section>
  );
}
