import {
  ConceptualDiagramFlow,
  EditorAssistant,
  EditorCanvas,
  EditorHeader,
  EditorSidebar,
  LogicalModelFlow,
} from '../../components';
import { useDiagramEditor } from '../../hooks';
import type { ConceptualModel } from '../../types';
import styles from './DiagramGeneratorPage.module.css';

const emptyConceptualModel: ConceptualModel = {
  metadata: {},
  entities: [],
  relationships: [],
  ambiguities: [],
};

export function DiagramGeneratorPage() {
  const {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical,
    selectedAttribute,
    selectedEntityIds,
    entityPositions,
    elementPositions,
    setDescription,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    addEntity,
    removeEntity,
    selectEntity,
    updateEntity,
    updateEntityPosition,
    updateElementPosition,
    clearCanvasSelection,
    addElementAtPosition,
    createRelationshipFromConnection,
    connectEntityToRelationship,
    updateRelationship,
    removeRelationship,
    disconnectEntityFromRelationship,
    cycleRelationshipCardinality,
    selectAttribute,
    updateAttribute,
    removeAttribute,
    connectAttributeToEntity,
    disconnectAttributeFromEntity,
  } = useDiagramEditor();
  const activeConceptualModel = conceptualModel ?? emptyConceptualModel;

  return (
    <main className={styles.app}>
      <EditorHeader
        isGenerating={isGenerating}
        isConverting={isConverting}
        canConvertToLogical={canConvertToLogical}
        onGenerate={generateConceptualDiagram}
        onConvert={convertConceptualToLogicalDiagram}
      />

      <div className={styles.workspace}>
        <EditorSidebar model={conceptualModel} onAddEntity={addEntity} />

        <EditorCanvas>
          <section className={styles.modelSection}>
            <div className={styles.canvasHeading}>
              <div>
                <span className={styles.eyebrow}>CANVAS</span>
                <h1>Modelo conceitual</h1>
              </div>
              <span className={styles.canvasHint}>Clique nos textos para editar · arraste para organizar</span>
            </div>

            <ConceptualDiagramFlow
              model={activeConceptualModel}
              onRemoveEntity={removeEntity}
              onSelectEntity={selectEntity}
              onClearSelection={clearCanvasSelection}
              onUpdateEntity={updateEntity}
              selectedEntityIds={selectedEntityIds}
              entityPositions={entityPositions}
              elementPositions={elementPositions}
              onUpdateEntityPosition={updateEntityPosition}
              onUpdateElementPosition={updateElementPosition}
              onAddElementAtPosition={addElementAtPosition}
              selectedAttribute={selectedAttribute}
              onSelectAttribute={selectAttribute}
              onUpdateAttribute={updateAttribute}
              onRemoveAttribute={removeAttribute}
              onConnectAttributeToEntity={connectAttributeToEntity}
              onDisconnectAttributeFromEntity={disconnectAttributeFromEntity}
              onConnectEntities={createRelationshipFromConnection}
              onConnectEntityToRelationship={connectEntityToRelationship}
              onUpdateRelationship={updateRelationship}
              onRemoveRelationship={removeRelationship}
              onDisconnectEntityFromRelationship={disconnectEntityFromRelationship}
              onCycleRelationshipCardinality={cycleRelationshipCardinality}
            />
            {!conceptualModel && (
              <div className={styles.emptyCanvas}>
                <span className={styles.emptyIcon}>⌘</span>
                <h1>Seu modelo começa aqui</h1>
                <p>Gere um modelo ou arraste um elemento da biblioteca para começar.</p>
              </div>
            )}
          </section>

          {logicalModel && (
            <section className={styles.modelSection}>
              <div className={styles.canvasHeading}>
                <div>
                  <span className={styles.eyebrow}>RESULTADO</span>
                  <h2>Modelo lógico</h2>
                </div>
              </div>
              <LogicalModelFlow model={logicalModel} />
            </section>
          )}
        </EditorCanvas>

        <EditorAssistant description={description} error={error} onDescriptionChange={setDescription} />
      </div>
    </main>
  );
}
