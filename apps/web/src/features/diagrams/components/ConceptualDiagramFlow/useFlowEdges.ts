import { applyEdgeChanges, type Edge, type EdgeChange, reconnectEdge } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EdgeControlPoints } from '../../hooks/editor/editor.types';
import { hydrateFlowEdges } from '../../types';
import type { ConceptualDiagramFlowProps, EdgeReconnectConnection } from './flow.types';
import { buildFlowEdges } from './flow-mappers';

type FlowEdgeDependencies = Pick<
  ConceptualDiagramFlowProps,
  | 'model'
  | 'entityPositions'
  | 'elementPositions'
  | 'edgeControlPoints'
  | 'restoredEdges'
  | 'edgeRestoreVersion'
  | 'onRestoredEdgesApplied'
  | 'onCycleRelationshipCardinality'
  | 'onUpdateEdgeControlPoints'
>;

/** Mantém seleção e remoção das edges sincronizadas com o estado controlado do React Flow. */
export function useFlowEdges(
  {
    model,
    entityPositions,
    elementPositions,
    edgeControlPoints,
    restoredEdges,
    edgeRestoreVersion,
    onRestoredEdgesApplied,
    onCycleRelationshipCardinality,
    onUpdateEdgeControlPoints,
  }: FlowEdgeDependencies,
  onReconnectEdge?: (edge: Edge, connection: EdgeReconnectConnection) => boolean,
) {
  const draftEdgeIds = useRef(new Set<string>());

  const handleControlPointsChange = useCallback((edgeId: string, controlPoints: EdgeControlPoints) => {
    draftEdgeIds.current.add(edgeId);
    setEdges((currentEdges) =>
      currentEdges.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, controlPoints } } : edge)),
    );
  }, []);

  const handleControlPointsCommit = useCallback(
    (edgeId: string, controlPoints: EdgeControlPoints) => {
      draftEdgeIds.current.delete(edgeId);
      onUpdateEdgeControlPoints?.(edgeId, controlPoints);
    },
    [onUpdateEdgeControlPoints],
  );

  const withReconnectHandler = useCallback(
    (edge: Edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onReconnect: (connection: EdgeReconnectConnection) => {
          if (!onReconnectEdge?.(edge, connection)) return false;

          setEdges((currentEdges) => reconnectEdge(edge, connection, currentEdges, { shouldReplaceId: false }));
          return true;
        },
      },
    }),
    [onReconnectEdge],
  );

  const mappedEdges = useMemo(
    () =>
      buildFlowEdges(
        model,
        { entityPositions, elementPositions, edgeControlPoints },
        {
          onCycleRelationshipCardinality,
          onControlPointsChange: handleControlPointsChange,
          onControlPointsCommit: handleControlPointsCommit,
        },
      ).map(withReconnectHandler),
    [
      edgeControlPoints,
      elementPositions,
      entityPositions,
      handleControlPointsChange,
      handleControlPointsCommit,
      model,
      onCycleRelationshipCardinality,
      withReconnectHandler,
    ],
  );
  const [edges, setEdges] = useState<Edge[]>(mappedEdges);

  useEffect(() => {
    setEdges((currentEdges) =>
      mappedEdges.map((nextEdge) => {
        const currentEdge = currentEdges.find((edge) => edge.id === nextEdge.id);
        return currentEdge
          ? {
              ...nextEdge,
              selected: currentEdge.selected,
              data: {
                ...nextEdge.data,
                controlPoints: draftEdgeIds.current.has(nextEdge.id)
                  ? (currentEdge.data as { controlPoints?: EdgeControlPoints } | undefined)?.controlPoints
                  : (nextEdge.data as { controlPoints?: EdgeControlPoints } | undefined)?.controlPoints,
              },
            }
          : nextEdge;
      }),
    );
  }, [mappedEdges]);

  const appliedRestoreVersion = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (edgeRestoreVersion === undefined || appliedRestoreVersion.current === edgeRestoreVersion || !restoredEdges) {
      return;
    }

    setEdges(hydrateFlowEdges(mappedEdges, restoredEdges));
    appliedRestoreVersion.current = edgeRestoreVersion;
    onRestoredEdgesApplied?.();
  }, [edgeRestoreVersion, mappedEdges, onRestoredEdgesApplied, restoredEdges]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, []);

  const selectAllEdges = useCallback(() => {
    setEdges((currentEdges) =>
      applyEdgeChanges(
        currentEdges.map((edge) => ({ id: edge.id, type: 'select' as const, selected: true })),
        currentEdges,
      ),
    );
  }, []);

  return { edges, handleEdgesChange, selectAllEdges };
}
