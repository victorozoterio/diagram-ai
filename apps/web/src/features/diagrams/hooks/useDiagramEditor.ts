import { useState } from 'react';

import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import type { ConceptualModel, LogicalModel } from '../types';

const defaultDescription =
  'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome, email e telefone. O pedido possui data e valor total.';

export function useDiagramEditor() {
  const [description, setDescription] = useState(defaultDescription);
  const [conceptualModel, setConceptualModel] = useState<ConceptualModel | null>(null);
  const [logicalModel, setLogicalModel] = useState<LogicalModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateConceptualDiagram() {
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

  async function convertConceptualToLogicalDiagram() {
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

  function clearLogicalModel() {
    setLogicalModel(null);
  }

  function clearDiagram() {
    setConceptualModel(null);
    setLogicalModel(null);
    setError(null);
  }

  return {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical: !!conceptualModel,
    setDescription,
    setConceptualModel,
    setLogicalModel,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    clearLogicalModel,
    clearDiagram,
  };
}
