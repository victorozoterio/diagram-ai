import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { buildFlowNodes } from './flow-mappers';

type FlowNodeDependencies = Pick<
  ConceptualDiagramFlowProps,
  | 'model'
  | 'entityPositions'
  | 'elementPositions'
  | 'selectedAttribute'
  | 'selectedEntityIds'
  | 'layoutVersion'
  | 'onSelectEntity'
  | 'onUpdateEntity'
  | 'onSelectAttribute'
  | 'onUpdateAttribute'
  | 'onUpdateRelationship'
  | 'onCycleRelationshipCardinality'
  | 'onUpdateElementPosition'
>;

/** Mantém a projeção do modelo sincronizada com as posições transitórias do React Flow. */
export function useFlowNodes({
  model,
  entityPositions,
  elementPositions,
  selectedAttribute,
  selectedEntityIds,
  layoutVersion = 0,
  onSelectEntity,
  onUpdateEntity,
  onSelectAttribute,
  onUpdateAttribute,
  onUpdateRelationship,
  onCycleRelationshipCardinality,
  onUpdateElementPosition,
}: FlowNodeDependencies) {
  const mappedNodes = useMemo(
    () =>
      buildFlowNodes(
        model,
        { entityPositions, elementPositions, selectedAttribute, selectedEntityIds },
        {
          onSelectEntity,
          onUpdateEntity,
          onSelectAttribute,
          onUpdateAttribute,
          onUpdateRelationship,
          onCycleRelationshipCardinality,
        },
      ),
    [
      elementPositions,
      entityPositions,
      model,
      onCycleRelationshipCardinality,
      onSelectAttribute,
      onSelectEntity,
      onUpdateAttribute,
      onUpdateEntity,
      onUpdateRelationship,
      selectedAttribute,
      selectedEntityIds,
    ],
  );

  const [nodes, setNodes] = useState<Node[]>(mappedNodes);
  const previousLayoutVersion = useRef(layoutVersion);

  useEffect(() => {
    if (previousLayoutVersion.current !== layoutVersion) {
      previousLayoutVersion.current = layoutVersion;
      setNodes(mappedNodes);
      return;
    }

    setNodes((currentNodes) =>
      mappedNodes.map((nextNode) => {
        const currentNode = currentNodes.find((node) => node.id === nextNode.id);
        return currentNode ? { ...nextNode, position: currentNode.position, selected: currentNode.selected } : nextNode;
      }),
    );
  }, [layoutVersion, mappedNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          onUpdateElementPosition?.(change.id, change.position);
        }
      });
    },
    [onUpdateElementPosition],
  );

  return { nodes, handleNodesChange };
}
