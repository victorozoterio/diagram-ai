import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import type { ConceptualModel, LogicalModel } from '../../types';
import { calculateInitialConceptualLayout } from './auto-layout';
import type { AttributeSelection, DiagramPosition, StateSetter } from './editor.types';

type LifecycleDependencies = {
  description: string;
  conceptualModel: ConceptualModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setIsGenerating: StateSetter<boolean>;
  setIsConverting: StateSetter<boolean>;
  setError: StateSetter<string | null>;
  setEntityPositions: StateSetter<Record<string, DiagramPosition>>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedAttribute: StateSetter<AttributeSelection>;
  setSelectedEntityIds: StateSetter<string[]>;
  setLayoutVersion: StateSetter<number>;
};

export function useDiagramLifecycle({
  description,
  conceptualModel,
  setConceptualModel,
  setLogicalModel,
  setIsGenerating,
  setIsConverting,
  setError,
  setEntityPositions,
  setElementPositions,
  setSelectedAttribute,
  setSelectedEntityIds,
  setLayoutVersion,
}: LifecycleDependencies) {
  async function generateConceptualDiagram() {
    setError(null);
    setLogicalModel(null);
    setIsGenerating(true);

    try {
      const generatedModel = await generateConceptualModel(description);
      let layout = { entityPositions: {}, elementPositions: {} };
      try {
        layout = await calculateInitialConceptualLayout(generatedModel);
      } catch {
        // O modelo ainda deve ser exibido caso o mecanismo de layout não consiga calculá-lo.
      }
      setConceptualModel(generatedModel);
      setSelectedAttribute(null);
      setSelectedEntityIds([]);
      setEntityPositions(layout.entityPositions);
      setElementPositions(layout.elementPositions);
      setLayoutVersion((currentVersion) => currentVersion + 1);
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
      setLogicalModel(await convertToLogicalModel(conceptualModel));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo lógico.');
    } finally {
      setIsConverting(false);
    }
  }

  function clearDiagram() {
    setConceptualModel(null);
    setLogicalModel(null);
    setError(null);
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
    setEntityPositions({});
    setElementPositions({});
  }

  return {
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    clearLogicalModel: () => setLogicalModel(null),
    clearDiagram,
  };
}
