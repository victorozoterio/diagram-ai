import type { DiagramAiProject, LogicalModel, LogicalTable } from '../../types';
import { EmptyCanvasState } from '../EmptyCanvasState/EmptyCanvasState';
import { LogicalModelFlow } from '../LogicalModelFlow/LogicalModelFlow';
import styles from './LogicalEditorCanvas.module.css';

type LogicalEditorCanvasProps = {
  model: LogicalModel;
  exportMenuTarget?: Element | null;
  exportDisabled?: boolean;
  onOpenProject?: (project: DiagramAiProject) => void | Promise<void>;
  onSaveProject?: (project: DiagramAiProject) => Promise<void>;
  isSavingProject?: boolean;
  onEditableProjectReady?: (getProject: () => DiagramAiProject) => void;
  onVisualChange?: () => void;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
  layoutVersion?: number;
  restoredViewport?: { x: number; y: number; zoom: number } | null;
  viewportRestoreVersion?: number;
};

export function LogicalEditorCanvas({
  model,
  exportMenuTarget,
  exportDisabled,
  onOpenProject,
  onSaveProject,
  isSavingProject,
  onEditableProjectReady,
  onVisualChange,
  onAddTable,
  onUpdateTable,
  onUpdateModel,
  layoutVersion = 0,
  restoredViewport,
  viewportRestoreVersion,
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
        exportDisabled={exportDisabled}
        onOpenProject={onOpenProject}
        onSaveProject={onSaveProject}
        isSavingProject={isSavingProject}
        onEditableProjectReady={onEditableProjectReady}
        onVisualChange={onVisualChange}
        onAddTable={onAddTable}
        onUpdateTable={onUpdateTable}
        onUpdateModel={onUpdateModel}
        layoutVersion={layoutVersion}
        restoredViewport={restoredViewport}
        viewportRestoreVersion={viewportRestoreVersion}
      />
      {model.tables.length === 0 && (
        <EmptyCanvasState description='Gere um modelo ou arraste um elemento da biblioteca para começar.' />
      )}
    </section>
  );
}
