import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preserveNodeMeasurement } from '../flow-node-measurement';
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
  | 'onUpdateEntityPosition'
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
  onUpdateEntityPosition,
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
        if (!currentNode) return nextNode;

        const hasCurrentDimensions =
          Number.isFinite(currentNode.width) &&
          Number.isFinite(currentNode.height) &&
          (currentNode.width ?? 0) > 0 &&
          (currentNode.height ?? 0) > 0;

        return preserveNodeMeasurement(
          {
            ...nextNode,
            ...(hasCurrentDimensions
              ? {
                  width: currentNode.width,
                  height: currentNode.height,
                  initialWidth: currentNode.initialWidth ?? currentNode.width,
                  initialHeight: currentNode.initialHeight ?? currentNode.height,
                  style: {
                    ...nextNode.style,
                    width: currentNode.width,
                    height: currentNode.height,
                  },
                }
              : {}),
            position: currentNode.dragging ? currentNode.position : nextNode.position,
            selected: currentNode.selected,
          },
          currentNode,
        );
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
          if (model.entities.some((entity) => entity.id === change.id)) {
            onUpdateEntityPosition?.(change.id, change.position);
          } else {
            onUpdateElementPosition?.(change.id, change.position);
          }
        }
      });
    },
    [model.entities, onUpdateElementPosition, onUpdateEntityPosition],
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
