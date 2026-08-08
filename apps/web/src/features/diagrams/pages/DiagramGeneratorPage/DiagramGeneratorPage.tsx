import { useState } from 'react';

import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import { ConceptualDiagramFlow, ConceptualModelViewer, LogicalModelViewer } from '@/features/diagrams/components';
import { LogicalModelFlow } from '@/features/diagrams/components/LogicalModelFlow';
import type { ConceptualModel, LogicalModel } from '@/features/diagrams/types';
import styles from './DiagramGeneratorPage.module.css';

const defaultDescription =
  'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome, email e telefone. O pedido possui data e valor total.';

export function DiagramGeneratorPage() {
  const [description, setDescription] = useState(defaultDescription);
  const [conceptualModel, setConceptualModel] = useState<ConceptualModel | null>(null);
  const [logicalModel, setLogicalModel] = useState<LogicalModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateConceptualModel() {
    setError(null);
    setLogicalModel(null);
    setIsGenerating(true);

    try {
      const model = await generateConceptualModel(description);

      setConceptualModel(model);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo conceitual.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConvertToLogicalModel() {
    if (!conceptualModel) {
      return;
    }

    setError(null);
    setIsConverting(true);

    try {
      const model = await convertToLogicalModel(conceptualModel);

      setLogicalModel(model);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo lógico.');
    } finally {
      setIsConverting(false);
    }
  }

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
            onClick={handleGenerateConceptualModel}
            disabled={isGenerating}
          >
            {isGenerating ? 'Gerando...' : 'Gerar modelo conceitual'}
          </button>

          <button
            className={styles.actionButton}
            type='button'
            onClick={handleConvertToLogicalModel}
            disabled={!conceptualModel || isConverting}
          >
            {isConverting ? 'Convertendo...' : 'Converter para modelo lógico'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </section>

      {conceptualModel && (
        <section className={styles.panel}>
          <h2>Modelo conceitual</h2>

          <ConceptualDiagramFlow model={conceptualModel} />

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
