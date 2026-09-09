import { useCallback, useEffect, useRef, useState } from 'react';
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
  const history = useRef<DiagramHistory>({ present: null, undo: [], redo: [] });
  const skipHistoryRef = useRef(false);
  const [, setHistoryVersion] = useState(0);

  const currentSnapshot = useCallback(
    (): DiagramSnapshot => ({
      conceptualModel,
      entityPositions,
      elementPositions,
      nodeSizes,
    }),
    [conceptualModel, elementPositions, entityPositions, nodeSizes],
  );

  useEffect(() => {
    const snapshot = currentSnapshot();
    if (!history.current.present) {
      history.current.present = snapshot;
      return;
    }

    if (skipHistoryRef.current) {
      history.current.present = snapshot;
      skipHistoryRef.current = false;
      return;
    }

    if (snapshotSignature(history.current.present) === snapshotSignature(snapshot)) {
      return;
    }

    history.current.undo.push(history.current.present);
    history.current.present = snapshot;
    history.current.redo = [];
    setHistoryVersion((version) => version + 1);
  }, [currentSnapshot]);

  const restoreSnapshot = useCallback((snapshot: DiagramSnapshot) => {
    setConceptualModel(snapshot.conceptualModel);
    setEntityPositions(snapshot.entityPositions);
    setElementPositions(snapshot.elementPositions);
    setNodeSizes(snapshot.nodeSizes);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.undo.pop();
    if (!previous || !history.current.present) return;

    history.current.redo.push(history.current.present);
    history.current.present = previous;
    skipHistoryRef.current = true;
    restoreSnapshot(previous);
    setHistoryVersion((version) => version + 1);
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    const next = history.current.redo.pop();
    if (!next || !history.current.present) return;

    history.current.undo.push(history.current.present);
    history.current.present = next;
    skipHistoryRef.current = true;
    restoreSnapshot(next);
    setHistoryVersion((version) => version + 1);
  }, [restoreSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key !== 'z') return;

      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

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
    setNodeSizes,
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
    undo,
    redo,
    canUndo: history.current.undo.length > 0,
    canRedo: history.current.redo.length > 0,
    ...relationshipActions,
    ...attributeActions,
    ...paletteActions,
  };
}

type DiagramSnapshot = {
  conceptualModel: ConceptualModel | null;
  entityPositions: Record<string, DiagramPosition>;
  elementPositions: Record<string, DiagramPosition>;
  nodeSizes: Record<string, DiagramSize>;
};

type DiagramHistory = {
  present: DiagramSnapshot | null;
  undo: DiagramSnapshot[];
  redo: DiagramSnapshot[];
};

function snapshotSignature(snapshot: DiagramSnapshot) {
  return JSON.stringify(snapshot);
}

function isEditableTarget(target: EventTarget | null) {
  const elements = [target instanceof Element ? target : null, document.activeElement];
  return elements.some((element) => {
    if (!(element instanceof HTMLElement)) return false;

    return Boolean(
      element.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        element.isContentEditable,
    );
  });
}
