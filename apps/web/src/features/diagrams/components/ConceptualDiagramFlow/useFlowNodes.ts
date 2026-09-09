import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { buildFlowNodes } from './flow-mappers';

type FlowNodeDependencies = Pick<
  ConceptualDiagramFlowProps,
  | 'model'
  | 'entityPositions'
  | 'elementPositions'
  | 'nodeSizes'
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
  | 'onUpdateNodeSize'
>;

/** Mantém a projeção do modelo sincronizada com as posições transitórias do React Flow. */
export function useFlowNodes({
  model,
  entityPositions,
  elementPositions,
  nodeSizes,
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
  onUpdateNodeSize,
}: FlowNodeDependencies) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const previousLayoutVersion = useRef(layoutVersion);

  const updateResizingNode = useCallback(
    (nodeId: string, size: { width: number; height: number }, resizing: boolean) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id !== nodeId
            ? node
            : {
                ...node,
                width: size.width,
                height: size.height,
                style: { ...node.style, width: size.width, height: size.height },
                data: { ...node.data, size },
                draggable: !resizing,
                resizing,
              },
        ),
      );
    },
    [],
  );

  const handleResizeStart = useCallback((nodeId: string) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === nodeId ? { ...node, draggable: false, resizing: true } : node)),
    );
  }, []);

  const handleResize = useCallback(
    (nodeId: string, size: { width: number; height: number }) => updateResizingNode(nodeId, size, true),
    [updateResizingNode],
  );

  const handleResizeEnd = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      updateResizingNode(nodeId, size, false);
      onUpdateNodeSize?.(nodeId, size);
    },
    [onUpdateNodeSize, updateResizingNode],
  );

  const mappedNodes = useMemo(
    () =>
      buildFlowNodes(
        model,
        { entityPositions, elementPositions, nodeSizes, selectedAttribute, selectedEntityIds },
        {
          onSelectEntity,
          onUpdateEntity,
          onSelectAttribute,
          onUpdateAttribute,
          onUpdateRelationship,
          onCycleRelationshipCardinality,
          onResizeStart: handleResizeStart,
          onResize: handleResize,
          onResizeEnd: handleResizeEnd,
        },
      ),
    [
      elementPositions,
      entityPositions,
      nodeSizes,
      model,
      onCycleRelationshipCardinality,
      onSelectAttribute,
      onSelectEntity,
      onUpdateAttribute,
      onUpdateEntity,
      onUpdateRelationship,
      handleResize,
      handleResizeEnd,
      handleResizeStart,
      selectedAttribute,
      selectedEntityIds,
    ],
  );

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
      const resizingNodeIds = new Set<string>();
      changes.forEach((change) => {
        if (change.type === 'dimensions' && change.resizing) {
          resizingNodeIds.add(change.id);
        }
      });

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging && !resizingNodeIds.has(change.id)) {
          onUpdateElementPosition?.(change.id, change.position);
        }
      });
    },
    [onUpdateElementPosition],
  );

  const selectAllNodes = useCallback(() => {
    setNodes((currentNodes) =>
      applyNodeChanges(
        currentNodes.map((node) => ({ id: node.id, type: 'select' as const, selected: true })),
        currentNodes,
      ),
    );
  }, []);

  return { nodes, handleNodesChange, selectAllNodes };
}
