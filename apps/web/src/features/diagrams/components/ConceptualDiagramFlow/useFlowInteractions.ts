import type { Connection, Edge, Node, ReactFlowInstance } from '@xyflow/react';
import type { DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { ElementKind } from '../../types';
import type { ConceptualDiagramFlowProps } from './flow.types';

type FlowInteractionDependencies = Pick<
  ConceptualDiagramFlowProps,
  | 'onRemoveEntity'
  | 'onRemoveAttribute'
  | 'onRemoveRelationship'
  | 'onAddElementAtPosition'
  | 'onConnectEntities'
  | 'onConnectEntityToRelationship'
>;

/** Encapsula gestos do board e os encaminha às ações do editor. */
export function useFlowInteractions({
  onRemoveEntity,
  onRemoveAttribute,
  onRemoveRelationship,
  onAddElementAtPosition,
  onConnectEntities,
  onConnectEntityToRelationship,
}: FlowInteractionDependencies) {
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  const handleNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === 'entity') {
          onRemoveEntity?.(node.id);
          return;
        }

        if (node.type === 'relationship') {
          onRemoveRelationship?.(node.id.replace('relationship:', ''));
          return;
        }

        if (node.type === 'attribute') {
          const [entityId, attributeId] = node.id.split(':');
          onRemoveAttribute?.(entityId, attributeId);
        }
      });
    },
    [onRemoveAttribute, onRemoveEntity, onRemoveRelationship],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const sourceIsRelationship = connection.source.startsWith('relationship:');
      const targetIsRelationship = connection.target.startsWith('relationship:');

      if (!sourceIsRelationship && !targetIsRelationship) {
        onConnectEntities?.(
          connection.source,
          connection.target,
          connection.sourceHandle ?? undefined,
          connection.targetHandle ?? undefined,
        );
        return;
      }

      if (sourceIsRelationship === targetIsRelationship) {
        return;
      }

      const relationshipId = (sourceIsRelationship ? connection.source : connection.target).replace(
        'relationship:',
        '',
      );
      const entityId = sourceIsRelationship ? connection.target : connection.source;

      onConnectEntityToRelationship?.(
        relationshipId,
        entityId,
        sourceIsRelationship ? (connection.sourceHandle ?? undefined) : (connection.targetHandle ?? undefined),
        sourceIsRelationship ? (connection.targetHandle ?? undefined) : (connection.sourceHandle ?? undefined),
        sourceIsRelationship ? 'relationship-to-entity' : 'entity-to-relationship',
      );
    },
    [onConnectEntities, onConnectEntityToRelationship],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const kind = event.dataTransfer.getData('application/diagram-element') as ElementKind;
      if (!kind || !flowInstance) {
        return;
      }

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const targetNode = flowInstance.getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 1,
        height: 1,
      })[0];

      onAddElementAtPosition?.(kind, position, targetNode?.id);
    },
    [flowInstance, onAddElementAtPosition],
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const relationshipIds = new Set(
        deletedEdges.filter((edge) => edge.type === 'relationship').map((edge) => edge.id.split(':')[0]),
      );

      relationshipIds.forEach((relationshipId) => {
        onRemoveRelationship?.(relationshipId);
      });
    },
    [onRemoveRelationship],
  );

  return {
    flowWrapperRef,
    setFlowInstance,
    handleNodesDelete,
    handleConnect,
    handleDrop,
    handleEdgesDelete,
  };
}
