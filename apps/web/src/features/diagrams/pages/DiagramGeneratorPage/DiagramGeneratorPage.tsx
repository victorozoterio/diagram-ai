import { useState } from 'react';
import type { EditorMode } from '../../components';
import {
  ConceptualDiagramFlow,
  EditorAssistant,
  EditorCanvas,
  EditorHeader,
  EditorSidebar,
  EmptyCanvasState,
  LogicalEditorCanvas,
  LogicalEditorSidebar,
} from '../../components';
import { useDiagramEditor } from '../../hooks';
import type { ConceptualModel, LogicalTable } from '../../types';
import styles from './DiagramGeneratorPage.module.css';

const emptyConceptualModel: ConceptualModel = {
  metadata: {},
  entities: [],
  relationships: [],
  ambiguities: [],
};

const emptyLogicalModel = { tables: [] };

export function DiagramGeneratorPage() {
  const [mode, setMode] = useState<EditorMode>('conceptual');
  const [exportMenuTarget, setExportMenuTarget] = useState<HTMLDivElement | null>(null);
  const {
    description,
    conceptualModel,
    logicalModel,
    setLogicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical,
    selectedAttribute,
    selectedEntityIds,
    layoutVersion,
    entityPositions,
    elementPositions,
    nodeSizes,
    edgeControlPoints,
    setDescription,
    generateConceptualDiagram,
    generateLogicalDiagram,
    convertConceptualToLogicalDiagram,
    removeEntity,
    selectEntity,
    updateEntity,
    updateEntityPosition,
    updateElementPosition,
    updateNodeSize,
    updateEdgeControlPoints,
    removeEdgeControlPoints,
    clearCanvasSelection,
    addElementAtPosition,
    createRelationshipFromConnection,
    connectEntityToRelationship,
    connectEntityToGeneralization,
    updateRelationship,
    removeRelationship,
    disconnectEntityFromRelationship,
    disconnectEntityFromGeneralization,
    cycleRelationshipCardinality,
    selectAttribute,
    updateAttribute,
    removeAttribute,
    connectAttributeToEntity,
    connectAttributeToAttribute,
    connectAttributeToRelationship,
    disconnectAttributeFromEntity,
    disconnectAttributeFromAttribute,
    disconnectAttributeFromRelationship,
  } = useDiagramEditor();
  const activeConceptualModel = conceptualModel ?? emptyConceptualModel;

  function addLogicalTable(position: { x: number; y: number }) {
    setLogicalModel((currentModel) => ({
      ...currentModel,
      tables: [
        ...(currentModel?.tables ?? []),
        {
          id: `logical-table-${Date.now()}`,
          name: 'Tabela',
          columns: [],
          size: { width: 280, height: 130 },
          position,
        },
      ],
    }));
  }

  function updateLogicalModel(updatedModel: NonNullable<typeof logicalModel>) {
    setLogicalModel(updatedModel);
  }

  function updateLogicalTable(updatedTable: LogicalTable) {
    setLogicalModel((currentModel) => {
      if (!currentModel) return currentModel;

      return {
        ...currentModel,
        tables: currentModel.tables.map((table) => (table.id === updatedTable.id ? updatedTable : table)),
      };
    });
  }

  async function convertAndOpenLogicalModel() {
    if (await convertConceptualToLogicalDiagram()) {
      setMode('logical');
    }
  }

  function generateActiveModel() {
    if (mode === 'logical') {
      return generateLogicalDiagram();
    }

    return generateConceptualDiagram();
  }

  return (
    <main className={styles.app}>
      <EditorHeader
        isGenerating={isGenerating}
        isConverting={isConverting}
        canConvertToLogical={canConvertToLogical}
        onGenerate={generateActiveModel}
        onConvert={convertAndOpenLogicalModel}
        exportMenuTargetRef={setExportMenuTarget}
        mode={mode}
        onModeChange={setMode}
      />

      <div className={styles.workspace}>
        {mode === 'conceptual' ? <EditorSidebar /> : <LogicalEditorSidebar />}

        <EditorCanvas>
          {mode === 'conceptual' ? (
            <section className={styles.modelSection}>
              <div className={styles.canvasHeading}>
                <div>
                  <span className={styles.eyebrow}>CANVAS</span>
                  <h1>Modelo conceitual</h1>
                </div>
                <span className={styles.canvasHint}>Arraste para organizar</span>
              </div>

              <ConceptualDiagramFlow
                model={activeConceptualModel}
                exportMenuTarget={exportMenuTarget}
                onRemoveEntity={removeEntity}
                onSelectEntity={selectEntity}
                onClearSelection={clearCanvasSelection}
                onUpdateEntity={updateEntity}
                selectedEntityIds={selectedEntityIds}
                layoutVersion={layoutVersion}
                entityPositions={entityPositions}
                elementPositions={elementPositions}
                nodeSizes={nodeSizes}
                edgeControlPoints={edgeControlPoints}
                onUpdateEntityPosition={updateEntityPosition}
                onUpdateElementPosition={updateElementPosition}
                onUpdateNodeSize={updateNodeSize}
                onUpdateEdgeControlPoints={updateEdgeControlPoints}
                onRemoveEdgeControlPoints={removeEdgeControlPoints}
                onAddElementAtPosition={addElementAtPosition}
                selectedAttribute={selectedAttribute}
                onSelectAttribute={selectAttribute}
                onUpdateAttribute={updateAttribute}
                onRemoveAttribute={removeAttribute}
                onConnectAttributeToEntity={connectAttributeToEntity}
                onConnectAttributeToAttribute={connectAttributeToAttribute}
                onConnectAttributeToRelationship={connectAttributeToRelationship}
                onDisconnectAttributeFromEntity={disconnectAttributeFromEntity}
                onDisconnectAttributeFromAttribute={disconnectAttributeFromAttribute}
                onDisconnectAttributeFromRelationship={disconnectAttributeFromRelationship}
                onConnectEntities={createRelationshipFromConnection}
                onConnectEntityToRelationship={connectEntityToRelationship}
                onConnectEntityToGeneralization={connectEntityToGeneralization}
                onUpdateRelationship={updateRelationship}
                onRemoveRelationship={removeRelationship}
                onDisconnectEntityFromRelationship={disconnectEntityFromRelationship}
                onDisconnectEntityFromGeneralization={disconnectEntityFromGeneralization}
                onCycleRelationshipCardinality={cycleRelationshipCardinality}
              />
              {!conceptualModel && (
                <EmptyCanvasState description='Gere um modelo ou arraste um elemento da biblioteca para começar.' />
              )}
            </section>
          ) : (
            <LogicalEditorCanvas
              model={logicalModel ?? emptyLogicalModel}
              exportMenuTarget={exportMenuTarget}
              onAddTable={addLogicalTable}
              onUpdateTable={updateLogicalTable}
              onUpdateModel={updateLogicalModel}
            />
          )}
        </EditorCanvas>

        <EditorAssistant description={description} error={error} onDescriptionChange={setDescription} />
      </div>
    </main>
  );
}
