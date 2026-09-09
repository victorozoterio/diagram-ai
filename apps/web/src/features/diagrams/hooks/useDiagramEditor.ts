import { useState } from 'react';
import type { ConceptualModel, LogicalModel } from '../types';
import type { AttributeSelection, DiagramPosition, DiagramSize } from './editor/editor.types';
import { DEFAULT_DESCRIPTION } from './editor/model-factories';
import { useAttributeActions } from './editor/useAttributeActions';
import { useDiagramLifecycle } from './editor/useDiagramLifecycle';
import { useEntityActions } from './editor/useEntityActions';
import { usePaletteActions } from './editor/usePaletteActions';
import { useRelationshipActions } from './editor/useRelationshipActions';

/**
 * Estado central do editor de diagramas.
 *
 * Cada grupo de ações está em um módulo próprio para manter este contrato estável
 * e evitar que componentes visuais conheçam as regras do modelo conceitual.
 */
export function useDiagramEditor() {
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [conceptualModel, setConceptualModel] = useState<ConceptualModel | null>(null);
  const [logicalModel, setLogicalModel] = useState<LogicalModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityPositions, setEntityPositions] = useState<Record<string, DiagramPosition>>({});
  const [elementPositions, setElementPositions] = useState<Record<string, DiagramPosition>>({});
  const [nodeSizes, setNodeSizes] = useState<Record<string, DiagramSize>>({});
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeSelection>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const entityActions = useEntityActions({
    conceptualModel,
    setConceptualModel,
    setLogicalModel,
    setEntityPositions,
    setElementPositions,
    setSelectedAttribute,
    setSelectedEntityIds,
  });

  const attributeActions = useAttributeActions({
    conceptualModel,
    setConceptualModel,
    setLogicalModel,
    setElementPositions,
    setSelectedAttribute,
    setSelectedEntityIds,
  });

  const relationshipActions = useRelationshipActions({
    setConceptualModel,
    setLogicalModel,
    setElementPositions,
    setSelectedEntityIds,
  });

  const paletteActions = usePaletteActions({
    selectedEntityIds,
    addEntity: entityActions.addEntity,
    addAttribute: attributeActions.addAttribute,
    addStandaloneRelationship: relationshipActions.addStandaloneRelationship,
    createRelationship: relationshipActions.createRelationship,
  });

  const lifecycleActions = useDiagramLifecycle({
    description,
    conceptualModel,
    setConceptualModel,
    setLogicalModel,
    setIsGenerating,
    setIsConverting,
    setError,
    setEntityPositions,
    setElementPositions,
    setNodeSizes,
    setSelectedAttribute,
    setSelectedEntityIds,
    setLayoutVersion,
  });

  function updateElementPosition(elementId: string, position: DiagramPosition) {
    setElementPositions((currentPositions) => ({ ...currentPositions, [elementId]: position }));
  }

  function updateNodeSize(nodeId: string, size: DiagramSize) {
    setNodeSizes((currentSizes) => ({ ...currentSizes, [nodeId]: size }));
  }

  function clearCanvasSelection() {
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
  }

  return {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical: Boolean(conceptualModel),
    selectedAttribute,
    selectedEntityIds,
    entityPositions,
    elementPositions,
    nodeSizes,
    layoutVersion,
    setDescription,
    setConceptualModel,
    setLogicalModel,
    ...lifecycleActions,
    ...entityActions,
    updateElementPosition,
    updateNodeSize,
    clearCanvasSelection,
    ...relationshipActions,
    ...attributeActions,
    ...paletteActions,
  };
}
