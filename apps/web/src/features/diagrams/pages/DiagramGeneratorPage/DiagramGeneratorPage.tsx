import { useRef, useState } from 'react';
import { generateSql, type SqlDialect } from '@/api/diagrams.api';
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
  SqlGeneratorModal,
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
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>('postgresql');
  const [sql, setSql] = useState('');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlMessage, setSqlMessage] = useState('');
  const sqlMessageTimeout = useRef<number | null>(null);
  const {
    description,
    conceptualModel,
    logicalModel,
    setLogicalModel,
    isGenerating,
    isConverting,
    error,
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
    convertLogicalToConceptualDiagram,
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
  const hasConceptualContent = Boolean(
    conceptualModel &&
      (conceptualModel.entities.length > 0 ||
        conceptualModel.relationships.length > 0 ||
        (conceptualModel.standaloneAttributes?.length ?? 0) > 0),
  );
  const hasLogicalContent = Boolean(logicalModel && logicalModel.tables.length > 0);

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

  async function convertAndOpenConceptualModel() {
    if (await convertLogicalToConceptualDiagram()) {
      setMode('conceptual');
    }
  }

  async function loadSql(dialect: SqlDialect) {
    if (!logicalModel) return;

    setIsGeneratingSql(true);
    setSqlError(null);
    setSqlMessage('');
    try {
      setSql(await generateSql(dialect, logicalModel));
    } catch (error) {
      setSqlError(error instanceof Error ? error.message : 'Não foi possível gerar o SQL.');
    } finally {
      setIsGeneratingSql(false);
    }
  }

  function openSqlGenerator() {
    if (mode !== 'logical' || !logicalModel) return;
    setIsSqlModalOpen(true);
    void loadSql(sqlDialect);
  }

  function changeSqlDialect(dialect: SqlDialect) {
    setSqlDialect(dialect);
    void loadSql(dialect);
  }

  async function copySql() {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      if (sqlMessageTimeout.current !== null) window.clearTimeout(sqlMessageTimeout.current);
      setSqlMessage('SQL copiado.');
      sqlMessageTimeout.current = window.setTimeout(() => {
        setSqlMessage('');
        sqlMessageTimeout.current = null;
      }, 2500);
    } catch {
      setSqlError('Não foi possível copiar o SQL.');
    }
  }

  function downloadSql() {
    if (!sql) return;
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modelo-${sqlDialect}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function changeMode(nextMode: EditorMode) {
    setMode(nextMode);
    if (nextMode !== 'logical') setIsSqlModalOpen(false);
  }

  function generateActiveModel() {
    if (mode === 'logical') {
      return generateLogicalDiagram();
    }

    return generateConceptualDiagram();
  }

  const convertingFromConceptual = mode === 'conceptual';

  return (
    <main className={styles.app}>
      <EditorHeader
        isGenerating={isGenerating}
        isConverting={isConverting}
        canConvert={convertingFromConceptual ? hasConceptualContent : hasLogicalContent}
        convertTitle={convertingFromConceptual ? 'Converter para modelo lógico' : 'Converter para modelo conceitual'}
        onGenerate={generateActiveModel}
        onConvert={convertingFromConceptual ? convertAndOpenLogicalModel : convertAndOpenConceptualModel}
        exportMenuTargetRef={setExportMenuTarget}
        mode={mode}
        onModeChange={changeMode}
        showSql={mode === 'logical'}
        canGenerateSql={hasLogicalContent}
        isGeneratingSql={isGeneratingSql}
        onGenerateSql={openSqlGenerator}
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
                exportDisabled={!hasConceptualContent}
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
              exportDisabled={!hasLogicalContent}
              onAddTable={addLogicalTable}
              onUpdateTable={updateLogicalTable}
              onUpdateModel={updateLogicalModel}
            />
          )}
        </EditorCanvas>

        <EditorAssistant description={description} error={error} onDescriptionChange={setDescription} />
      </div>

      {isSqlModalOpen && (
        <SqlGeneratorModal
          dialect={sqlDialect}
          sql={sql}
          isLoading={isGeneratingSql}
          error={sqlError}
          message={sqlMessage}
          onDialectChange={changeSqlDialect}
          onCopy={copySql}
          onDownload={downloadSql}
          onClose={() => setIsSqlModalOpen(false)}
        />
      )}
    </main>
  );
}
