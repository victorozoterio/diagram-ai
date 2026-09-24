import {
  convertToConceptualModel,
  convertToLogicalModel,
  generateConceptualModel,
  generateLogicalModel,
} from '@/api/diagrams.api';
import type { ConceptualModel, LogicalModel } from '../../types';
import { calculateInitialConceptualLayout, calculateInitialLogicalLayout } from './auto-layout';
import type { AttributeSelection, DiagramPosition, DiagramSize, EdgeControlPoints, StateSetter } from './editor.types';

type LifecycleDependencies = {
  description: string;
  conceptualModel: ConceptualModel | null;
  logicalModel: LogicalModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setIsGenerating: StateSetter<boolean>;
  setIsConverting: StateSetter<boolean>;
  setError: StateSetter<string | null>;
  setEntityPositions: StateSetter<Record<string, DiagramPosition>>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setNodeSizes: StateSetter<Record<string, DiagramSize>>;
  setEdgeControlPoints: StateSetter<Record<string, EdgeControlPoints>>;
  setSelectedAttribute: StateSetter<AttributeSelection>;
  setSelectedEntityIds: StateSetter<string[]>;
  setLayoutVersion: StateSetter<number>;
};

export function useDiagramLifecycle({
  description,
  conceptualModel,
  logicalModel,
  setConceptualModel,
  setLogicalModel,
  setIsGenerating,
  setIsConverting,
  setError,
  setEntityPositions,
  setElementPositions,
  setNodeSizes,
  setEdgeControlPoints,
  setSelectedAttribute,
  setSelectedEntityIds,
  setLayoutVersion,
}: LifecycleDependencies) {
  async function generateConceptualDiagram() {
    setError(null);
    setIsGenerating(true);

    try {
      const generatedModel = await generateConceptualModel(description);
      await presentConceptualModel(generatedModel);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo conceitual.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateLogicalDiagram() {
    setError(null);
    setIsGenerating(true);

    try {
      const generatedModel = await generateLogicalModel(description);
      const logicalModel = await calculateInitialLogicalLayout(normalizeLogicalModel(generatedModel));
      setLogicalModel(logicalModel);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo lógico.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function convertConceptualToLogicalDiagram() {
    if (!conceptualModel) {
      return false;
    }

    setError(null);
    setIsConverting(true);
    try {
      const convertedModel = await convertToLogicalModel(conceptualModel);
      const logicalModel = await calculateInitialLogicalLayout(normalizeLogicalModel(convertedModel));
      setLogicalModel(logicalModel);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo lógico.');
      return false;
    } finally {
      setIsConverting(false);
    }
  }

  async function convertLogicalToConceptualDiagram() {
    if (!logicalModel) {
      return false;
    }

    setError(null);
    setIsConverting(true);
    try {
      const convertedModel = await convertToConceptualModel(logicalModel);
      await presentConceptualModel(convertedModel);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo conceitual.');
      return false;
    } finally {
      setIsConverting(false);
    }
  }

  async function presentConceptualModel(model: ConceptualModel) {
    let layout = { entityPositions: {}, elementPositions: {} };
    try {
      layout = await calculateInitialConceptualLayout(model);
    } catch {
      // O modelo continua disponível caso o mecanismo de layout não responda.
    }
    setConceptualModel(model);
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
    setEntityPositions(layout.entityPositions);
    setElementPositions(layout.elementPositions);
    setNodeSizes({});
    setEdgeControlPoints({});
    setLayoutVersion((currentVersion) => currentVersion + 1);
  }

  function clearDiagram() {
    setConceptualModel(null);
    setLogicalModel(null);
    setError(null);
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
    setEntityPositions({});
    setElementPositions({});
    setNodeSizes({});
    setEdgeControlPoints({});
  }

  return {
    generateConceptualDiagram,
    generateLogicalDiagram,
    convertConceptualToLogicalDiagram,
    convertLogicalToConceptualDiagram,
    clearLogicalModel: () => setLogicalModel(null),
    clearDiagram,
  };
}

function normalizeLogicalModel(model: LogicalModel): LogicalModel {
  return {
    ...model,
    tables: model.tables.map((table) => ({
      ...table,
      columns: table.columns.map((column) => ({
        ...column,
        nullable: column.nullable ?? !column.required,
      })),
    })),
    relationships: [],
  };
}
