import {
  ConceptualDiagramFlow,
  EditorAssistant,
  EditorCanvas,
  EditorHeader,
  EditorSidebar,
  LogicalModelFlow,
} from '../../components';
import { useDiagramEditor } from '../../hooks';
import styles from './DiagramGeneratorPage.module.css';

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
    setDescription,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    addEntity,
    removeEntity,
    selectEntity,
    updateEntity,
    updateEntityPosition,
    createRelationshipFromConnection,
    updateRelationship,
    removeRelationship,
    cycleRelationshipCardinality,
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
  } = useDiagramEditor();

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
          {conceptualModel ? (
            <section className={styles.modelSection}>
              <div className={styles.canvasHeading}>
                <div>
                  <span className={styles.eyebrow}>CANVAS</span>
                  <h1>Modelo conceitual</h1>
                </div>
                <span className={styles.canvasHint}>Clique nos textos para editar · arraste para organizar</span>
              </div>

              <ConceptualDiagramFlow
                model={conceptualModel}
                onRemoveEntity={removeEntity}
                onSelectEntity={selectEntity}
                onUpdateEntity={updateEntity}
                selectedEntityIds={selectedEntityIds}
                entityPositions={entityPositions}
                onUpdateEntityPosition={updateEntityPosition}
                onAddAttribute={addAttribute}
                selectedAttribute={selectedAttribute}
                onSelectAttribute={selectAttribute}
                onUpdateAttribute={updateAttribute}
                onRemoveAttribute={removeAttribute}
                onConnectEntities={createRelationshipFromConnection}
                onUpdateRelationship={updateRelationship}
                onRemoveRelationship={removeRelationship}
                onCycleRelationshipCardinality={cycleRelationshipCardinality}
              />
            </section>
          ) : (
            <div className={styles.emptyCanvas}>
              <span className={styles.emptyIcon}>⌘</span>
              <h1>Seu modelo começa aqui</h1>
              <p>Gere um modelo a partir de uma descrição ou adicione uma entidade pela barra lateral.</p>
            </div>
          )}

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
