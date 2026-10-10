import type { DiagramAiFlowEdge, DiagramAiProject, LogicalModel, LogicalTable } from '../../types';
import { EmptyCanvasState } from '../EmptyCanvasState/EmptyCanvasState';
import { LogicalModelFlow } from '../LogicalModelFlow/LogicalModelFlow';
import styles from './LogicalEditorCanvas.module.css';

type LogicalEditorCanvasProps = {
  model: LogicalModel;
  exportMenuTarget?: Element | null;
  exportDisabled?: boolean;
  onOpenProject?: (project: DiagramAiProject) => void | Promise<void>;
  onNavigateToDiagrams?: () => void;
  onSaveProject?: (project: DiagramAiProject) => Promise<void>;
  isSavingProject?: boolean;
  onEditableProjectReady?: (getProject: () => DiagramAiProject) => void;
  onVisualChange?: () => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onViewportSizeChange?: (size: { width: number; height: number }) => void;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
  layoutVersion?: number;
  restoredViewport?: { x: number; y: number; zoom: number } | null;
  viewportRestoreVersion?: number;
  restoredEdges?: DiagramAiFlowEdge[] | null;
  edgeRestoreVersion?: number;
  onRestoredEdgesApplied?: () => void;
};

export function LogicalEditorCanvas({
  model,
  exportMenuTarget,
  exportDisabled,
  onOpenProject,
  onNavigateToDiagrams,
  onSaveProject,
  isSavingProject,
  onEditableProjectReady,
  onVisualChange,
  onViewportChange,
  onViewportSizeChange,
  onAddTable,
  onUpdateTable,
  onUpdateModel,
  layoutVersion = 0,
  restoredViewport,
  viewportRestoreVersion,
  restoredEdges,
  edgeRestoreVersion,
  onRestoredEdgesApplied,
}: LogicalEditorCanvasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>CANVAS</span>
          <h1>Lógico</h1>
        </div>
        <span className={styles.hint}>Arraste para organizar</span>
      </div>
      <LogicalModelFlow
        model={model}
        exportMenuTarget={exportMenuTarget}
        exportDisabled={exportDisabled}
        onOpenProject={onOpenProject}
        onNavigateToDiagrams={onNavigateToDiagrams}
        onSaveProject={onSaveProject}
        isSavingProject={isSavingProject}
        onEditableProjectReady={onEditableProjectReady}
        onVisualChange={onVisualChange}
        onViewportChange={onViewportChange}
        onViewportSizeChange={onViewportSizeChange}
        onAddTable={onAddTable}
        onUpdateTable={onUpdateTable}
        onUpdateModel={onUpdateModel}
        layoutVersion={layoutVersion}
        restoredViewport={restoredViewport}
        viewportRestoreVersion={viewportRestoreVersion}
        restoredEdges={restoredEdges}
        edgeRestoreVersion={edgeRestoreVersion}
        onRestoredEdgesApplied={onRestoredEdgesApplied}
      />
      {model.tables.length === 0 && (
        <EmptyCanvasState description='Gere um modelo ou arraste um elemento da biblioteca para começar.' />
      )}
    </section>
  );
}
