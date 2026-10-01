import { useRef, useState } from 'react';
import { analyzeAmbiguities, type ClarificationAnswer, generateSql, type SqlDialect } from '@/api/diagrams.api';
import type { AuthenticatedUser } from '@/features/auth/components/AuthenticatedUserMenu';
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
import type { ClarificationStep } from '../../components/EditorAssistant/EditorAssistant';
import { useDiagramEditor } from '../../hooks';
import type { ConceptualModel, DiagramAiProject, LogicalTable } from '../../types';
import styles from './DiagramGeneratorPage.module.css';

const emptyConceptualModel: ConceptualModel = {
  metadata: {},
  entities: [],
  relationships: [],
  ambiguities: [],
};

const emptyLogicalModel = { tables: [] };

type DiagramGeneratorPageProps = {
  isSessionLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  user: AuthenticatedUser | null;
};

export function DiagramGeneratorPage({ isSessionLoading, onSignIn, onSignOut, user }: DiagramGeneratorPageProps) {
  const [mode, setMode] = useState<EditorMode>('conceptual');
  const [exportMenuTarget, setExportMenuTarget] = useState<HTMLDivElement | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>('postgresql');
  const [sql, setSql] = useState('');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlMessage, setSqlMessage] = useState('');
  const [isAnalyzingAmbiguities, setIsAnalyzingAmbiguities] = useState(false);
  const [clarificationStep, setClarificationStep] = useState<ClarificationStep | null>(null);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const sqlMessageTimeout = useRef<number | null>(null);
  const {
    description,
    conceptualModel,
    logicalModel,
    setLogicalModel,
    restoreDiagramProject,
    isGenerating,
    isConverting,
    error,
    selectedAttribute,
    selectedEntityIds,
    layoutVersion,
    logicalLayoutVersion,
    conceptualViewport,
    logicalViewport,
    conceptualViewportRestoreVersion,
    logicalViewportRestoreVersion,
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

  function openDiagramProject(project: DiagramAiProject) {
    restoreDiagramProject(project);
    setMode(project.modelType);
    setIsSqlModalOpen(false);
  }

  async function generateActiveModel(clarifications?: ClarificationAnswer[]) {
    if (mode === 'logical') {
      await generateLogicalDiagram(clarifications);
      return;
    }

    await generateConceptualDiagram(clarifications);
  }

  async function startGeneration() {
    setClarificationError(null);
    setIsAnalyzingAmbiguities(true);

    try {
      const analysis = await analyzeAmbiguities(description);
      if (analysis.requiresClarification && analysis.questions.length > 0) {
        setClarificationStep({
          questions: analysis.questions,
          currentIndex: 0,
          answers: {},
          customAnswers: {},
        });
        return;
      }
    } catch (analysisError) {
      setClarificationError(
        analysisError instanceof Error ? analysisError.message : 'Não foi possível analisar ambiguidades na descrição.',
      );
      return;
    } finally {
      setIsAnalyzingAmbiguities(false);
    }

    await generateActiveModel();
  }

  function updateClarificationStep(step: ClarificationStep) {
    setClarificationStep(step);
  }

  function goToPreviousClarification() {
    setClarificationStep((currentStep) => {
      if (!currentStep || currentStep.currentIndex === 0) return null;
      return { ...currentStep, currentIndex: currentStep.currentIndex - 1 };
    });
  }

  async function continueClarifications() {
    if (!clarificationStep) return;

    if (clarificationStep.currentIndex < clarificationStep.questions.length - 1) {
      setClarificationStep({ ...clarificationStep, currentIndex: clarificationStep.currentIndex + 1 });
      return;
    }

    const clarifications = clarificationStep.questions.flatMap((question) => {
      const selectedAnswers = clarificationStep.answers[question.id] ?? [];
      const customAnswer = clarificationStep.customAnswers[question.id]?.trim();
      const answers = selectedAnswers
        .filter((answer) => answer !== '__custom_answer__')
        .concat(customAnswer ? [customAnswer] : []);

      return answers.length > 0
        ? [
            {
              questionId: question.id,
              questionText: question.text,
              kind: question.kind,
              answers,
            },
          ]
        : [];
    });

    setClarificationStep(null);
    await generateActiveModel(clarifications);
  }

  function changeDescription(nextDescription: string) {
    setDescription(nextDescription);
    setClarificationError(null);
    setClarificationStep(null);
  }

  const convertingFromConceptual = mode === 'conceptual';

  return (
    <main className={styles.app}>
      <EditorHeader
        isConverting={isConverting}
        canConvert={convertingFromConceptual ? hasConceptualContent : hasLogicalContent}
        convertTitle={convertingFromConceptual ? 'Converter para modelo lógico' : 'Converter para modelo conceitual'}
        onConvert={convertingFromConceptual ? convertAndOpenLogicalModel : convertAndOpenConceptualModel}
        exportMenuTargetRef={setExportMenuTarget}
        mode={mode}
        onModeChange={changeMode}
        showSql={mode === 'logical'}
        canGenerateSql={hasLogicalContent}
        isGeneratingSql={isGeneratingSql}
        onGenerateSql={openSqlGenerator}
        isSessionLoading={isSessionLoading}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        user={user}
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
                onOpenProject={openDiagramProject}
                restoredViewport={conceptualViewport}
                viewportRestoreVersion={conceptualViewportRestoreVersion}
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
              onOpenProject={openDiagramProject}
              onAddTable={addLogicalTable}
              onUpdateTable={updateLogicalTable}
              onUpdateModel={updateLogicalModel}
              layoutVersion={logicalLayoutVersion}
              restoredViewport={logicalViewport}
              viewportRestoreVersion={logicalViewportRestoreVersion}
            />
          )}
        </EditorCanvas>

        <EditorAssistant
          description={description}
          error={clarificationError ?? error}
          onDescriptionChange={changeDescription}
          isGenerating={isGenerating}
          isAnalyzing={isAnalyzingAmbiguities}
          clarificationStep={clarificationStep}
          onGenerate={startGeneration}
          onClarificationChange={updateClarificationStep}
          onClarificationBack={goToPreviousClarification}
          onClarificationContinue={continueClarifications}
        />
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
