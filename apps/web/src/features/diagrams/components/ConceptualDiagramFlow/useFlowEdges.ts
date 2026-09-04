import { applyEdgeChanges, type Edge, type EdgeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { buildFlowEdges } from './flow-mappers';

type FlowEdgeDependencies = Pick<ConceptualDiagramFlowProps, 'model' | 'onCycleRelationshipCardinality'>;

/** Mantém seleção e remoção das edges sincronizadas com o estado controlado do React Flow. */
export function useFlowEdges({ model, onCycleRelationshipCardinality }: FlowEdgeDependencies) {
  const mappedEdges = useMemo(
    () => buildFlowEdges(model, { onCycleRelationshipCardinality }),
    [model, onCycleRelationshipCardinality],
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

  return { edges, handleEdgesChange };
}
