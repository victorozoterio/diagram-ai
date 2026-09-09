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
  | 'onConnectAttributeToEntity'
  | 'onConnectAttributeToAttribute'
  | 'onConnectAttributeToRelationship'
  | 'onDisconnectAttributeFromEntity'
  | 'onDisconnectAttributeFromAttribute'
  | 'onDisconnectAttributeFromRelationship'
  | 'onDisconnectEntityFromRelationship'
  | 'onConnectEntities'
  | 'onConnectEntityToRelationship'
>;

/** Encapsula gestos do board e os encaminha às ações do editor. */
export function useFlowInteractions({
  onRemoveEntity,
  onRemoveAttribute,
  onRemoveRelationship,
  onAddElementAtPosition,
  onConnectAttributeToEntity,
  onConnectAttributeToAttribute,
  onConnectAttributeToRelationship,
  onDisconnectAttributeFromEntity,
  onDisconnectAttributeFromAttribute,
  onDisconnectAttributeFromRelationship,
  onDisconnectEntityFromRelationship,
  onConnectEntities,
  onConnectEntityToRelationship,
}: FlowInteractionDependencies) {
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const edgesRemovedWithNodesRef = useRef(new Set<string>());

  const handleBeforeDelete = useCallback(async ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    const deletedNodeIds = new Set(nodes.map((node) => node.id));
    edgesRemovedWithNodesRef.current = new Set(
      edges.filter((edge) => deletedNodeIds.has(edge.source) || deletedNodeIds.has(edge.target)).map((edge) => edge.id),
    );
    return true;
  }, []);

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
          const attribute = parseAttributeNodeId(node.id);
          if (attribute) onRemoveAttribute?.(attribute.entityId, attribute.attributeId);
        }
      });
      edgesRemovedWithNodesRef.current.clear();
    },
    [onRemoveAttribute, onRemoveEntity, onRemoveRelationship],
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const disconnectedEdges = deletedEdges.filter((edge) => !edgesRemovedWithNodesRef.current.has(edge.id));

      disconnectedEdges
        .filter((edge) => edge.type === 'attribute')
        .forEach((edge) => {
          if (edge.id.startsWith('attribute-relationship:')) {
            const [, relationshipId, entityId, attributeId] = edge.id.split(':');
            if (relationshipId && attributeId) {
              onDisconnectAttributeFromRelationship?.(
                relationshipId,
                entityId === 'standalone' ? null : entityId,
                attributeId,
              );
            }
            return;
          }

          if (edge.id.startsWith('attribute-parent:')) {
            const [, entityId, attributeId, _parentEntityId, parentAttributeId] = edge.id.split(':');
            onDisconnectAttributeFromAttribute?.(
              entityId === 'standalone' ? null : entityId,
              attributeId,
              parentAttributeId,
            );
            return;
          }

          const [entityId, attributeId] = edge.id.replace('attribute:', '').split(':');
          if (entityId && attributeId) onDisconnectAttributeFromEntity?.(entityId, attributeId);
        });

      disconnectedEdges
        .filter((edge) => edge.type === 'relationship')
        .forEach((edge) => {
          const relationshipId = edge.id.split(':')[0];
          const entityId = edge.data?.entityId as string | undefined;
          if (relationshipId && entityId) onDisconnectEntityFromRelationship?.(relationshipId, entityId);
        });
    },
    [
      onDisconnectAttributeFromAttribute,
      onDisconnectAttributeFromEntity,
      onDisconnectAttributeFromRelationship,
      onDisconnectEntityFromRelationship,
    ],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const sourceIsRelationship = connection.source.startsWith('relationship:');
      const targetIsRelationship = connection.target.startsWith('relationship:');
      const sourceAttribute = parseAttributeNodeId(connection.source);
      const targetAttribute = parseAttributeNodeId(connection.target);

      if (sourceAttribute && targetAttribute) {
        onConnectAttributeToAttribute?.(
          sourceAttribute.entityId,
          sourceAttribute.attributeId,
          targetAttribute.entityId,
          targetAttribute.attributeId,
          connection.sourceHandle ?? undefined,
          connection.targetHandle ?? undefined,
        );
        return;
      }

      if (sourceAttribute && targetIsRelationship) {
        onConnectAttributeToRelationship?.(
          sourceAttribute.entityId,
          sourceAttribute.attributeId,
          connection.target.replace('relationship:', ''),
          connection.targetHandle ?? undefined,
          connection.sourceHandle ?? undefined,
        );
        return;
      }

      if (targetAttribute && sourceIsRelationship) {
        onConnectAttributeToRelationship?.(
          targetAttribute.entityId,
          targetAttribute.attributeId,
          connection.source.replace('relationship:', ''),
          connection.sourceHandle ?? undefined,
          connection.targetHandle ?? undefined,
        );
        return;
      }

      if (sourceAttribute && !targetIsRelationship && !targetAttribute) {
        onConnectAttributeToEntity?.(
          sourceAttribute.entityId,
          sourceAttribute.attributeId,
          connection.target,
          connection.targetHandle ?? undefined,
          connection.sourceHandle ?? undefined,
        );
        return;
      }

      if (targetAttribute && !sourceIsRelationship && !sourceAttribute) {
        onConnectAttributeToEntity?.(
          targetAttribute.entityId,
          targetAttribute.attributeId,
          connection.source,
          connection.sourceHandle ?? undefined,
          connection.targetHandle ?? undefined,
        );
        return;
      }

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
    [
      onConnectAttributeToAttribute,
      onConnectAttributeToEntity,
      onConnectAttributeToRelationship,
      onConnectEntities,
      onConnectEntityToRelationship,
    ],
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

  return {
    flowWrapperRef,
    setFlowInstance,
    handleBeforeDelete,
    handleNodesDelete,
    handleEdgesDelete,
    handleConnect,
    handleDrop,
  };
}

function parseAttributeNodeId(nodeId: string): { entityId: string | null; attributeId: string } | null {
  if (nodeId.startsWith('relationship:')) {
    return null;
  }

  if (nodeId.startsWith('standalone:')) {
    return { entityId: null, attributeId: nodeId.slice('standalone:'.length) };
  }

  const separatorIndex = nodeId.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === nodeId.length - 1) {
    return null;
  }

  return {
    entityId: nodeId.slice(0, separatorIndex),
    attributeId: nodeId.slice(separatorIndex + 1),
  };
}
