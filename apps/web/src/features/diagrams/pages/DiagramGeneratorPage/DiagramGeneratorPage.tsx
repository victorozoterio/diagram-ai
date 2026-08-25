import { ConceptualDiagramFlow, ConceptualModelViewer, LogicalModelFlow, LogicalModelViewer } from '../../components';
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
      <section className={styles.hero}>
        <span>Diagram.AI</span>
        <h1>Modelagem de dados assistida por IA</h1>
        <p>Descreva um sistema em linguagem natural e gere modelos conceituais e lógicos para banco de dados.</p>
      </section>

      <section className={styles.panel}>
        <label className={styles.formLabel} htmlFor='description'>
          Descrição do sistema
        </label>

        <textarea
          id='description'
          className={styles.descriptionField}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
        />

        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            type='button'
            onClick={generateConceptualDiagram}
            disabled={isGenerating}
          >
            {isGenerating ? 'Gerando...' : 'Gerar modelo conceitual'}
          </button>

          <button
            className={styles.actionButton}
            type='button'
            onClick={convertConceptualToLogicalDiagram}
            disabled={!canConvertToLogical || isConverting}
          >
            {isConverting ? 'Convertendo...' : 'Converter para modelo lógico'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </section>

      {conceptualModel && (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2>Modelo conceitual</h2>

            <button className={styles.secondaryButton} type='button' onClick={addEntity}>
              + Adicionar entidade
            </button>
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

          <ConceptualModelViewer model={conceptualModel} />
        </section>
      )}

      {logicalModel && (
        <section className={styles.panel}>
          <h2>Modelo lógico</h2>

          <LogicalModelFlow model={logicalModel} />

          <LogicalModelViewer model={logicalModel} />
        </section>
      )}
    </main>
  );
}
