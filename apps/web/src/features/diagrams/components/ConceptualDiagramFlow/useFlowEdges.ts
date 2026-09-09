import { applyEdgeChanges, type Edge, type EdgeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { buildFlowEdges } from './flow-mappers';

type FlowEdgeDependencies = Pick<
  ConceptualDiagramFlowProps,
  'model' | 'entityPositions' | 'elementPositions' | 'onCycleRelationshipCardinality'
>;

/** Mantém seleção e remoção das edges sincronizadas com o estado controlado do React Flow. */
export function useFlowEdges({
  model,
  entityPositions,
  elementPositions,
  onCycleRelationshipCardinality,
}: FlowEdgeDependencies) {
  const mappedEdges = useMemo(
    () => buildFlowEdges(model, { entityPositions, elementPositions }, { onCycleRelationshipCardinality }),
    [elementPositions, entityPositions, model, onCycleRelationshipCardinality],
  );
  const [edges, setEdges] = useState<Edge[]>(mappedEdges);

  useEffect(() => {
    setEdges((currentEdges) =>
      mappedEdges.map((nextEdge) => {
        const currentEdge = currentEdges.find((edge) => edge.id === nextEdge.id);
        return currentEdge ? { ...nextEdge, selected: currentEdge.selected } : nextEdge;
      }),
    );
  }, [mappedEdges]);

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
