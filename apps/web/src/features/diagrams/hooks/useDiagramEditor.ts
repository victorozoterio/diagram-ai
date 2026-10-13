import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ConceptualModel,
  clearProjectFlowSelection,
  type DiagramAiFlowEdge,
  type DiagramAiProject,
  type LogicalModel,
} from '../types';
import type { AttributeSelection, DiagramPosition, DiagramSize, EdgeControlPoints } from './editor/editor.types';
import {
  type DiagramViewport,
  type EditorModeViewports,
  EMPTY_MODE_VIEWPORTS,
  withModeViewport,
} from './editor/mode-viewports';
import { DEFAULT_DESCRIPTION } from './editor/model-factories';
import {
  createModelHistory,
  recordModelHistory,
  redoModelHistory,
  resetModelHistory,
  undoModelHistory,
} from './editor/model-history';
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
  const [edgeControlPoints, setEdgeControlPoints] = useState<Record<string, EdgeControlPoints>>({});
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeSelection>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [logicalLayoutVersion, setLogicalLayoutVersion] = useState(0);
  const [viewports, setViewports] = useState<EditorModeViewports>(EMPTY_MODE_VIEWPORTS);
  const [restoredEdges, setRestoredEdges] = useState<Record<keyof EditorModeViewports, DiagramAiFlowEdge[] | null>>({
    conceptual: null,
    logical: null,
  });
  const [edgeRestoreVersions, setEdgeRestoreVersions] = useState<Record<keyof EditorModeViewports, number>>({
    conceptual: 0,
    logical: 0,
  });
  const [viewportRestoreVersions, setViewportRestoreVersions] = useState<Record<keyof EditorModeViewports, number>>({
    conceptual: 0,
    logical: 0,
  });
  const conceptualHistory = useRef(createModelHistory<DiagramSnapshot>());
  const logicalHistory = useRef(createModelHistory<LogicalModel | null>());
  const skipHistoryRef = useRef<Record<'conceptual' | 'logical', boolean>>({ conceptual: false, logical: false });
  const [, setHistoryVersion] = useState(0);

  const updateViewport = useCallback((mode: keyof EditorModeViewports, viewport: DiagramViewport) => {
    setViewports((currentViewports) => withModeViewport(currentViewports, mode, viewport));
  }, []);

  const restoreViewport = useCallback((mode: keyof EditorModeViewports, viewport: DiagramViewport) => {
    setViewports((currentViewports) => withModeViewport(currentViewports, mode, viewport));
    setViewportRestoreVersions((currentVersions) => ({ ...currentVersions, [mode]: currentVersions[mode] + 1 }));
  }, []);

  const clearViewport = useCallback((mode: keyof EditorModeViewports) => {
    setViewports((currentViewports) => withModeViewport(currentViewports, mode, null));
  }, []);

  const consumeRestoredEdges = useCallback((mode: keyof EditorModeViewports) => {
    setRestoredEdges((currentEdges) => ({ ...currentEdges, [mode]: null }));
  }, []);

  const currentSnapshot = useCallback(
    (): DiagramSnapshot => ({
      conceptualModel,
      entityPositions,
      elementPositions,
      nodeSizes,
      edgeControlPoints,
    }),
    [conceptualModel, edgeControlPoints, elementPositions, entityPositions, nodeSizes],
  );

  useEffect(() => {
    const snapshot = currentSnapshot();
    if (skipHistoryRef.current.conceptual) {
      skipHistoryRef.current.conceptual = false;
      return;
    }

    if (recordModelHistory(conceptualHistory.current, snapshot, snapshotsDiffer)) {
      setHistoryVersion((version) => version + 1);
    }
  }, [currentSnapshot]);

  useEffect(() => {
    if (skipHistoryRef.current.logical) {
      skipHistoryRef.current.logical = false;
      return;
    }

    if (recordModelHistory(logicalHistory.current, logicalModel, snapshotsDiffer)) {
      setHistoryVersion((version) => version + 1);
    }
  }, [logicalModel]);

  const restoreSnapshot = useCallback((snapshot: DiagramSnapshot) => {
    setConceptualModel(snapshot.conceptualModel);
    setEntityPositions(snapshot.entityPositions);
    setElementPositions(snapshot.elementPositions);
    setNodeSizes(snapshot.nodeSizes);
    setEdgeControlPoints(snapshot.edgeControlPoints);
  }, []);

  const undoConceptual = useCallback(() => {
    const previous = undoModelHistory(conceptualHistory.current);
    if (previous === undefined) return;

    skipHistoryRef.current.conceptual = true;
    restoreSnapshot(previous);
    setHistoryVersion((version) => version + 1);
  }, [restoreSnapshot]);

  const redoConceptual = useCallback(() => {
    const next = redoModelHistory(conceptualHistory.current);
    if (next === undefined) return;

    skipHistoryRef.current.conceptual = true;
    restoreSnapshot(next);
    setHistoryVersion((version) => version + 1);
  }, [restoreSnapshot]);

  const undoLogical = useCallback(() => {
    const previous = undoModelHistory(logicalHistory.current);
    if (previous === undefined) return;

    skipHistoryRef.current.logical = true;
    setLogicalModel(previous);
    setHistoryVersion((version) => version + 1);
  }, []);

  const redoLogical = useCallback(() => {
    const next = redoModelHistory(logicalHistory.current);
    if (next === undefined) return;

    skipHistoryRef.current.logical = true;
    setLogicalModel(next);
    setHistoryVersion((version) => version + 1);
  }, []);

  const entityActions = useEntityActions({
    conceptualModel,
    setConceptualModel,
    setEntityPositions,
    setElementPositions,
    setSelectedAttribute,
    setSelectedEntityIds,
  });

  const attributeActions = useAttributeActions({
    conceptualModel,
    setConceptualModel,
    setElementPositions,
    setNodeSizes,
    setSelectedAttribute,
    setSelectedEntityIds,
  });

  const relationshipActions = useRelationshipActions({
    setConceptualModel,
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
    setLogicalLayoutVersion,
    clearViewport,
  });

  function updateElementPosition(elementId: string, position: DiagramPosition) {
    setElementPositions((currentPositions) => ({ ...currentPositions, [elementId]: position }));
  }

  function updateNodeSize(nodeId: string, size: DiagramSize) {
    setNodeSizes((currentSizes) => ({ ...currentSizes, [nodeId]: size }));
  }

  function updateEdgeControlPoints(edgeId: string, controlPoints: EdgeControlPoints) {
    setEdgeControlPoints((currentPoints) => ({ ...currentPoints, [edgeId]: controlPoints }));
  }

  function removeEdgeControlPoints(edgeIds: string[]) {
    if (edgeIds.length === 0) return;

    setEdgeControlPoints((currentPoints) => {
      const removedIds = new Set(edgeIds);
      return Object.fromEntries(Object.entries(currentPoints).filter(([edgeId]) => !removedIds.has(edgeId)));
    });
  }

  function clearCanvasSelection() {
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
  }

  function restoreDiagramProject(project: DiagramAiProject) {
    resetModelHistory(conceptualHistory.current);
    resetModelHistory(logicalHistory.current);
    const restoredProject = clearProjectFlowSelection(project);
    const visualState = restoredProject.visual.state;

    if (restoredProject.modelType === 'conceptual') {
      const model = restoredProject.semanticModel as ConceptualModel;
      const restoredVisualState = conceptualVisualState(visualState, restoredProject.visual.nodes, model);
      setConceptualModel(model);
      setEntityPositions(restoredVisualState.entityPositions);
      setElementPositions(restoredVisualState.elementPositions);
      setNodeSizes(restoredVisualState.nodeSizes);
      setEdgeControlPoints(restoredVisualState.edgeControlPoints);
      setSelectedAttribute(null);
      setSelectedEntityIds([]);
      setRestoredEdges((currentEdges) => ({ ...currentEdges, conceptual: restoredProject.visual.edges }));
      setEdgeRestoreVersions((currentVersions) => ({
        ...currentVersions,
        conceptual: currentVersions.conceptual + 1,
      }));
      clearViewport('conceptual');
      setLayoutVersion((version) => version + 1);
      return;
    }

    setLogicalModel(restoreLogicalModel(restoredProject.semanticModel as LogicalModel, restoredProject.visual.nodes));
    setRestoredEdges((currentEdges) => ({ ...currentEdges, logical: restoredProject.visual.edges }));
    setEdgeRestoreVersions((currentVersions) => ({ ...currentVersions, logical: currentVersions.logical + 1 }));
    clearViewport('logical');
    setLogicalLayoutVersion((version) => version + 1);
  }

  return {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical: Boolean(conceptualModel),
    canConvertToConceptual: Boolean(logicalModel),
    selectedAttribute,
    selectedEntityIds,
    entityPositions,
    elementPositions,
    nodeSizes,
    edgeControlPoints,
    layoutVersion,
    logicalLayoutVersion,
    conceptualViewport: viewports.conceptual,
    logicalViewport: viewports.logical,
    conceptualViewportRestoreVersion: viewportRestoreVersions.conceptual,
    logicalViewportRestoreVersion: viewportRestoreVersions.logical,
    conceptualRestoredEdges: restoredEdges.conceptual,
    logicalRestoredEdges: restoredEdges.logical,
    conceptualEdgeRestoreVersion: edgeRestoreVersions.conceptual,
    logicalEdgeRestoreVersion: edgeRestoreVersions.logical,
    consumeRestoredEdges,
    setDescription,
    updateViewport,
    restoreViewport,
    setConceptualModel,
    setLogicalModel,
    restoreDiagramProject,
    ...lifecycleActions,
    ...entityActions,
    updateElementPosition,
    updateNodeSize,
    updateEdgeControlPoints,
    removeEdgeControlPoints,
    clearCanvasSelection,
    undoConceptual,
    redoConceptual,
    undoLogical,
    redoLogical,
    canUndoConceptual: conceptualHistory.current.undo.length > 0,
    canRedoConceptual: conceptualHistory.current.redo.length > 0,
    canUndoLogical: logicalHistory.current.undo.length > 0,
    canRedoLogical: logicalHistory.current.redo.length > 0,
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
  edgeControlPoints: Record<string, EdgeControlPoints>;
};

function snapshotsDiffer<T>(previous: T, next: T) {
  return snapshotSignature(previous) !== snapshotSignature(next);
}

function snapshotSignature(snapshot: unknown) {
  return JSON.stringify(snapshot);
}

function conceptualVisualState(
  state: DiagramAiProject['visual']['state'] | undefined,
  nodes: DiagramAiProject['visual']['nodes'],
  model: ConceptualModel,
) {
  const entityPositions = readPositions(state?.entityPositions);
  const elementPositions = readPositions(state?.elementPositions);
  const nodeSizes = readSizes(state?.nodeSizes);

  for (const node of nodes) {
    if (model.entities.some((entity) => entity.id === node.id)) {
      entityPositions[node.id] ??= node.position;
    } else {
      elementPositions[node.id] ??= node.position;
    }

    if (node.width && node.height) {
      nodeSizes[node.id] ??= { width: node.width, height: node.height };
    }
  }

  return {
    entityPositions,
    elementPositions,
    nodeSizes,
    edgeControlPoints: readControlPoints(state?.edgeControlPoints),
  };
}

function restoreLogicalModel(model: LogicalModel, nodes: DiagramAiProject['visual']['nodes']): LogicalModel {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return {
    ...model,
    tables: model.tables.map((table) => {
      const node = nodesById.get(table.id);
      if (!node) return table;

      return {
        ...table,
        position: node.position,
        ...(node.width && node.height ? { size: { width: node.width, height: node.height } } : {}),
      };
    }),
  };
}

function readPositions(value: unknown): Record<string, DiagramPosition> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([id, position]) => {
      if (!isRecord(position) || !isFiniteNumber(position.x) || !isFiniteNumber(position.y)) return [];
      return [[id, { x: position.x, y: position.y }]];
    }),
  );
}

function readSizes(value: unknown): Record<string, DiagramSize> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([id, size]) => {
      if (!isRecord(size) || !isFiniteNumber(size.width) || !isFiniteNumber(size.height)) return [];
      return [[id, { width: size.width, height: size.height }]];
    }),
  );
}

function readControlPoints(value: unknown): Record<string, EdgeControlPoints> {
  return isRecord(value) ? (value as Record<string, EdgeControlPoints>) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
