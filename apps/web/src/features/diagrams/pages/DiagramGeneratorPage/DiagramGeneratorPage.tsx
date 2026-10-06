import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeAmbiguities,
  type ClarificationAnswer,
  createDiagram,
  generateSql,
  renameDiagram,
  type SqlDialect,
  updateDiagram,
} from '@/api/diagrams.api';
import type { AuthenticatedUser } from '@/features/auth/components/AuthenticatedUserMenu';
import { selectedCardinalityConstraint } from '../../clarification-cardinality';
import type { EditorMode, SaveStatus } from '../../components';
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
import {
  type ConceptualModel,
  createDiagramAiDocument,
  type DiagramAiDocument,
  type DiagramAiProject,
  type LogicalTable,
} from '../../types';
import styles from './DiagramGeneratorPage.module.css';

const emptyConceptualModel: ConceptualModel = {
  metadata: {},
  entities: [],
  relationships: [],
  ambiguities: [],
};

const emptyLogicalModel = { tables: [] };
const AUTO_SAVE_INTERVAL = 2 * 60 * 1000;
const editorModes: EditorMode[] = ['conceptual', 'logical'];
const NEW_DIAGRAM_LABEL = 'Diagrama';

type SaveState = {
  dirty: boolean;
  status: SaveStatus | null;
};

type EditableProjectFactory = () => DiagramAiProject;

type DiagramGeneratorPageProps = {
  initialDiagramId?: string;
  initialDiagramName?: string;
  initialProject?: DiagramAiDocument;
  isSessionLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onNavigateToDiagrams: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveBeforeLeaveReady?: (save: (() => Promise<void>) | null) => void;
  user: AuthenticatedUser | null;
};

export function DiagramGeneratorPage({
  initialDiagramId,
  initialDiagramName,
  initialProject,
  isSessionLoading,
  onSignIn,
  onSignOut,
  onNavigateToDiagrams,
  onDirtyChange,
  onSaveBeforeLeaveReady,
  user,
}: DiagramGeneratorPageProps) {
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
  const [diagramIds, setDiagramIds] = useState<Partial<Record<EditorMode, string>>>({});
  const [diagramName, setDiagramName] = useState<string | undefined>(undefined);
  const [saveStates, setSaveStates] = useState<Record<EditorMode, SaveState>>({
    conceptual: { dirty: false, status: null },
    logical: { dirty: false, status: null },
  });
  const sqlMessageTimeout = useRef<number | null>(null);
  const diagramIdsRef = useRef(diagramIds);
  const diagramNameRef = useRef(diagramName);
  const saveStatesRef = useRef(saveStates);
  const editableProjectFactories = useRef<Partial<Record<EditorMode, EditableProjectFactory>>>({});
  const savedModelsRef = useRef<Partial<Record<EditorMode, DiagramAiProject>>>({});
  const saveInFlight = useRef<Record<EditorMode, boolean>>({ conceptual: false, logical: false });
  const saveQueued = useRef<Record<EditorMode, boolean>>({ conceptual: false, logical: false });
  const saveCompletionRef = useRef<Record<EditorMode, Promise<void> | null>>({ conceptual: null, logical: null });
  const projectRevisions = useRef<Record<EditorMode, number>>({ conceptual: 0, logical: 0 });
  const observedProjectSignatures = useRef<Partial<Record<EditorMode, string>>>({});
  const skipNextDirtyCheck = useRef<Record<EditorMode, boolean>>({ conceptual: false, logical: false });
  const restoredInitialDiagramId = useRef<string | undefined>(undefined);
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
    updateViewport,
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

  useEffect(() => {
    diagramIdsRef.current = diagramIds;
  }, [diagramIds]);

  useEffect(() => {
    diagramNameRef.current = diagramName;
  }, [diagramName]);

  useEffect(() => {
    saveStatesRef.current = saveStates;
  }, [saveStates]);

  const updateSaveState = useCallback((targetMode: EditorMode, changes: Partial<SaveState>) => {
    setSaveStates((currentStates) => {
      const nextStates = {
        ...currentStates,
        [targetMode]: { ...currentStates[targetMode], ...changes },
      };
      saveStatesRef.current = nextStates;
      return nextStates;
    });
  }, []);

  const setStoredDiagramName = useCallback((name?: string) => {
    diagramNameRef.current = name;
    setDiagramName(name);
  }, []);

  const markProjectDirty = useCallback(
    (targetMode: EditorMode) => {
      projectRevisions.current[targetMode] += 1;
      updateSaveState(targetMode, { dirty: true, status: 'unsaved' });
    },
    [updateSaveState],
  );

  const saveProject = useCallback(
    async (targetMode: EditorMode, suppliedProject?: DiagramAiProject): Promise<void> => {
      if (saveInFlight.current[targetMode]) {
        saveQueued.current[targetMode] = true;
        await saveCompletionRef.current[targetMode];
        return;
      }

      const project = suppliedProject ?? editableProjectFactories.current[targetMode]?.();
      if (!project) throw new Error('O diagrama ainda não está pronto para ser salvo.');
      const otherMode = targetMode === 'conceptual' ? 'logical' : 'conceptual';
      const otherProject = editableProjectFactories.current[otherMode]?.();
      const models = {
        ...savedModelsRef.current,
        ...(otherProject ? { [otherMode]: otherProject } : {}),
        [targetMode]: project,
      };
      const document = createDiagramAiDocument(models, targetMode);

      saveInFlight.current[targetMode] = true;
      let completeSave: () => void = () => {};
      saveCompletionRef.current[targetMode] = new Promise<void>((resolve) => {
        completeSave = resolve;
      });
      const revisionAtRequest = projectRevisions.current[targetMode];
      updateSaveState(targetMode, { status: 'saving' });

      try {
        const name = diagramNameRef.current ?? NEW_DIAGRAM_LABEL;
        const diagramId = diagramIdsRef.current.conceptual ?? diagramIdsRef.current.logical;
        const savedDiagram = diagramId
          ? await updateDiagram(diagramId, name, document)
          : await createDiagram(diagramNameRef.current, document);

        savedModelsRef.current = models;
        if (!diagramId) {
          diagramIdsRef.current = { conceptual: savedDiagram.id, logical: savedDiagram.id };
          setDiagramIds(diagramIdsRef.current);
        }
        setStoredDiagramName(savedDiagram.name);

        if (projectRevisions.current[targetMode] === revisionAtRequest) {
          updateSaveState(targetMode, { dirty: false, status: 'saved' });
        } else {
          updateSaveState(targetMode, { dirty: true, status: 'unsaved' });
        }
      } catch (error) {
        updateSaveState(targetMode, { dirty: true, status: 'error' });
        throw error;
      } finally {
        saveInFlight.current[targetMode] = false;
        if (saveQueued.current[targetMode]) {
          saveQueued.current[targetMode] = false;
          void saveProject(targetMode);
        }
        completeSave();
      }
    },
    [setStoredDiagramName, updateSaveState],
  );

  const hasUnsavedChanges = saveStates.conceptual.dirty || saveStates.logical.dirty;

  const saveDirtyProjects = useCallback(async () => {
    for (const targetMode of editorModes) {
      while (saveStatesRef.current[targetMode].dirty) {
        await saveProject(targetMode);
      }
    }
  }, [saveProject]);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    onSaveBeforeLeaveReady?.(saveDirtyProjects);
    return () => onSaveBeforeLeaveReady?.(null);
  }, [onSaveBeforeLeaveReady, saveDirtyProjects]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      for (const targetMode of editorModes) {
        if (saveStatesRef.current[targetMode].dirty && !saveInFlight.current[targetMode]) {
          void saveProject(targetMode).catch(() => undefined);
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => window.clearInterval(interval);
  }, [saveProject]);

  const conceptualProjectSignature = useMemo(
    () =>
      JSON.stringify({
        conceptualModel,
        entityPositions,
        elementPositions,
        nodeSizes,
        edgeControlPoints,
      }),
    [conceptualModel, edgeControlPoints, elementPositions, entityPositions, nodeSizes],
  );
  const logicalProjectSignature = useMemo(() => JSON.stringify(logicalModel), [logicalModel]);

  const observeProjectChange = useCallback(
    (targetMode: EditorMode, signature: string, hasContent: boolean) => {
      const previousSignature = observedProjectSignatures.current[targetMode];
      observedProjectSignatures.current[targetMode] = signature;

      if (!hasContent || previousSignature === undefined || previousSignature === signature) return;
      if (skipNextDirtyCheck.current[targetMode]) {
        skipNextDirtyCheck.current[targetMode] = false;
        return;
      }

      markProjectDirty(targetMode);
    },
    [markProjectDirty],
  );

  useEffect(() => {
    observeProjectChange('conceptual', conceptualProjectSignature, hasConceptualContent);
  }, [conceptualProjectSignature, hasConceptualContent, observeProjectChange]);

  useEffect(() => {
    observeProjectChange('logical', logicalProjectSignature, hasLogicalContent);
  }, [hasLogicalContent, logicalProjectSignature, observeProjectChange]);

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
      changeMode('logical');
    }
  }

  async function convertAndOpenConceptualModel() {
    if (await convertLogicalToConceptualDiagram()) {
      changeMode('conceptual');
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
    if (nextMode === mode) return;

    const currentProject = editableProjectFactories.current[mode]?.();
    if (currentProject) {
      savedModelsRef.current = { ...savedModelsRef.current, [mode]: currentProject };
      updateViewport(mode, currentProject.visual.viewport);
    }

    setMode(nextMode);
    if (nextMode !== 'logical') setIsSqlModalOpen(false);
  }

  const openDiagramProject = useCallback(
    (project: DiagramAiProject, diagramId?: string, diagramName?: string) => {
      if (diagramId) {
        skipNextDirtyCheck.current[project.modelType] = true;
        diagramIdsRef.current = { conceptual: diagramId, logical: diagramId };
        setDiagramIds(diagramIdsRef.current);
        updateSaveState(project.modelType, { dirty: false, status: 'saved' });
      } else {
        diagramIdsRef.current = { ...diagramIdsRef.current, [project.modelType]: undefined };
        setDiagramIds(diagramIdsRef.current);
      }
      setStoredDiagramName(diagramName);
      savedModelsRef.current = { [project.modelType]: project };
      restoreDiagramProject(project);
      setMode(project.modelType);
      setIsSqlModalOpen(false);
    },
    [restoreDiagramProject, setStoredDiagramName, updateSaveState],
  );

  useEffect(() => {
    if (!initialProject || !initialDiagramId || restoredInitialDiagramId.current === initialDiagramId) return;

    const models = initialProject.models;
    savedModelsRef.current = models;
    diagramIdsRef.current = { conceptual: initialDiagramId, logical: initialDiagramId };
    setDiagramIds(diagramIdsRef.current);
    setStoredDiagramName(initialDiagramName);
    if (models.conceptual) restoreDiagramProject(models.conceptual);
    if (models.logical) restoreDiagramProject(models.logical);
    skipNextDirtyCheck.current = { conceptual: true, logical: true };
    updateSaveState('conceptual', { dirty: false, status: 'saved' });
    updateSaveState('logical', { dirty: false, status: 'saved' });
    setMode(
      models[initialProject.lastSavedMode]
        ? initialProject.lastSavedMode
        : models.conceptual
          ? 'conceptual'
          : 'logical',
    );
    restoredInitialDiagramId.current = initialDiagramId;
  }, [
    initialDiagramId,
    initialDiagramName,
    initialProject,
    restoreDiagramProject,
    setStoredDiagramName,
    updateSaveState,
  ]);

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
      console.warn('Falha na análise de ambiguidades; gerando o modelo sem esclarecimentos.', analysisError);
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
      const cardinality = selectedCardinalityConstraint(question, answers);

      return answers.length > 0
        ? [
            {
              questionId: question.id,
              questionText: question.text,
              kind: question.kind,
              answers,
              ...(cardinality ? { cardinality } : {}),
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
  const activeSaveStatus = (mode === 'conceptual' ? hasConceptualContent : hasLogicalContent)
    ? saveStates[mode].status
    : undefined;
  const activeDiagramName = diagramName ?? NEW_DIAGRAM_LABEL;

  async function renameActiveDiagram(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    const diagramId = diagramIdsRef.current.conceptual ?? diagramIdsRef.current.logical;
    if (!diagramId) {
      setStoredDiagramName(normalizedName);
      markProjectDirty(mode);
      return;
    }

    const wasDirty = saveStatesRef.current[mode].dirty;
    updateSaveState(mode, { status: 'saving' });

    try {
      const updatedDiagram = await renameDiagram(diagramId, normalizedName);
      setStoredDiagramName(updatedDiagram.name);
      updateSaveState(mode, { status: wasDirty ? 'unsaved' : 'saved' });
    } catch (renameError) {
      updateSaveState(mode, { status: 'error' });
      throw renameError;
    }
  }

  return (
    <main className={styles.app}>
      <EditorHeader
        diagramName={activeDiagramName}
        isConverting={isConverting}
        canConvert={convertingFromConceptual ? hasConceptualContent : hasLogicalContent}
        convertTitle={convertingFromConceptual ? 'Converter para modelo lógico' : 'Converter para modelo conceitual'}
        onConvert={convertingFromConceptual ? convertAndOpenLogicalModel : convertAndOpenConceptualModel}
        onNavigateToDiagrams={onNavigateToDiagrams}
        onRenameDiagram={renameActiveDiagram}
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
        saveStatus={activeSaveStatus ?? undefined}
      />

      <div className={styles.workspace}>
        {mode === 'conceptual' ? <EditorSidebar /> : <LogicalEditorSidebar />}

        <EditorCanvas>
          {mode === 'conceptual' ? (
            <section className={styles.modelSection}>
              <div className={styles.canvasHeading}>
                <div>
                  <span className={styles.eyebrow}>CANVAS</span>
                  <h1>Conceitual</h1>
                </div>
                <span className={styles.canvasHint}>Arraste para organizar</span>
              </div>

              <ConceptualDiagramFlow
                model={activeConceptualModel}
                exportMenuTarget={exportMenuTarget}
                exportDisabled={!hasConceptualContent}
                onOpenProject={openDiagramProject}
                onNavigateToDiagrams={onNavigateToDiagrams}
                onSaveProject={user ? (project) => saveProject('conceptual', project) : undefined}
                isSavingProject={saveStates.conceptual.status === 'saving'}
                onEditableProjectReady={(getProject) => {
                  editableProjectFactories.current.conceptual = getProject;
                }}
                onVisualChange={() => markProjectDirty('conceptual')}
                onViewportChange={(viewport) => updateViewport('conceptual', viewport)}
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
              onNavigateToDiagrams={onNavigateToDiagrams}
              onSaveProject={user ? (project) => saveProject('logical', project) : undefined}
              isSavingProject={saveStates.logical.status === 'saving'}
              onEditableProjectReady={(getProject) => {
                editableProjectFactories.current.logical = getProject;
              }}
              onVisualChange={() => markProjectDirty('logical')}
              onViewportChange={(viewport) => updateViewport('logical', viewport)}
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
