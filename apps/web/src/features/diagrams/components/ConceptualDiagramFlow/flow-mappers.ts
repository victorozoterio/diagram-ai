import type { Edge, Node } from '@xyflow/react';
import type { Attribute, ConceptualModel } from '../../types';
import type {
  AttributeNodeData,
  DiagramPosition,
  EntityNodeData,
  RelationshipEdgeData,
  RelationshipNodeData,
} from './flow.types';
import { DEFAULT_NODE_SIZES, MIN_NODE_SIZES, type NodeSize } from './node-resize';

type FlowMapperCallbacks = {
  onSelectEntity?: EntityNodeData['onSelectEntity'];
  onUpdateEntity?: EntityNodeData['onUpdateEntity'];
  onSelectAttribute?: AttributeNodeData['onSelectAttribute'];
  onUpdateAttribute?: AttributeNodeData['onUpdateAttribute'];
  onUpdateRelationship?: RelationshipNodeData['onUpdateRelationship'];
  onCycleRelationshipCardinality?: RelationshipEdgeData['onCycleRelationshipCardinality'];
  onResizeStart?: (nodeId: string) => void;
  onResize?: (nodeId: string, size: NodeSize) => void;
  onResizeEnd?: (nodeId: string, size: NodeSize) => void;
};

type FlowMapperState = {
  entityPositions?: Record<string, DiagramPosition>;
  elementPositions?: Record<string, DiagramPosition>;
  nodeSizes?: Record<string, NodeSize>;
  selectedEntityIds?: string[];
  selectedAttribute?: { entityId: string | null; attributeId: string } | null;
};

const NODE_SIZES = DEFAULT_NODE_SIZES;

type ConnectionSide = 'left' | 'right' | 'top' | 'bottom';

function getClosestConnectionHandles(
  sourcePosition: DiagramPosition,
  sourceSize: { width: number; height: number },
  targetPosition: DiagramPosition,
  targetSize: { width: number; height: number },
  sourcePrefix: string,
  targetPrefix: string,
) {
  const sourceCenter = {
    x: sourcePosition.x + sourceSize.width / 2,
    y: sourcePosition.y + sourceSize.height / 2,
  };
  const targetCenter = {
    x: targetPosition.x + targetSize.width / 2,
    y: targetPosition.y + targetSize.height / 2,
  };
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;
  const sourceSide: ConnectionSide =
    Math.abs(deltaX) >= Math.abs(deltaY) ? (deltaX >= 0 ? 'right' : 'left') : deltaY >= 0 ? 'bottom' : 'top';
  const oppositeSide: Record<ConnectionSide, ConnectionSide> = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
  };

  return {
    sourceHandle: `${sourcePrefix}-${sourceSide}`,
    targetHandle: `${targetPrefix}-${oppositeSide[sourceSide]}`,
  };
}

const fallbackEntityPosition = (index: number): DiagramPosition => ({
  x: 80 + (index % 3) * 360,
  y: 80 + Math.floor(index / 3) * 280,
});

export function buildFlowNodes(model: ConceptualModel, state: FlowMapperState, callbacks: FlowMapperCallbacks): Node[] {
  const entityNodes = model.entities.map((entity, index) => ({
    id: entity.id,
    type: 'entity',
    ...nodeDimensions(state.nodeSizes?.[entity.id], NODE_SIZES.entity),
    position: state.entityPositions?.[entity.id] ?? fallbackEntityPosition(index),
    data: {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      size: nodeSize(state.nodeSizes?.[entity.id], NODE_SIZES.entity),
      minSize: MIN_NODE_SIZES.entity,
      isSelected: state.selectedEntityIds?.at(-1) === entity.id && !state.selectedAttribute,
      onSelectEntity: callbacks.onSelectEntity,
      onUpdateEntity: callbacks.onUpdateEntity,
      onResizeStart: callbacks.onResizeStart,
      onResize: callbacks.onResize,
      onResizeEnd: callbacks.onResizeEnd,
    } satisfies EntityNodeData,
  }));

  const attributeNodes = model.entities.flatMap((entity) =>
    entity.attributes.map((attribute, index) => ({
      id: `${entity.id}:${attribute.id}`,
      type: 'attribute',
      selectable: true,
      ...nodeDimensions(state.nodeSizes?.[`${entity.id}:${attribute.id}`], NODE_SIZES.attribute),
      position: state.elementPositions?.[`${entity.id}:${attribute.id}`] ?? {
        x: (state.entityPositions?.[entity.id]?.x ?? 80) + 250,
        y: (state.entityPositions?.[entity.id]?.y ?? 80) + index * 100,
      },
      data: {
        nodeId: `${entity.id}:${attribute.id}`,
        attribute,
        entityId: entity.id,
        size: nodeSize(state.nodeSizes?.[`${entity.id}:${attribute.id}`], NODE_SIZES.attribute),
        minSize: MIN_NODE_SIZES.attribute,
        selected:
          state.selectedAttribute?.entityId === entity.id && state.selectedAttribute.attributeId === attribute.id,
        onSelectAttribute: callbacks.onSelectAttribute,
        onUpdateAttribute: callbacks.onUpdateAttribute,
        onResizeStart: callbacks.onResizeStart,
        onResize: callbacks.onResize,
        onResizeEnd: callbacks.onResizeEnd,
      } satisfies AttributeNodeData,
    })),
  );
  const componentNodes = model.entities.flatMap((entity) =>
    entity.attributes.flatMap((parentAttribute) =>
      parentAttribute.components.map((component, index) => {
        const id = `${entity.id}:${component.id}`;
        const parentId = `${entity.id}:${parentAttribute.id}`;
        const parentPosition = state.elementPositions?.[parentId] ??
          state.elementPositions?.[`${entity.id}:${parentAttribute.id}`] ?? {
            x: (state.entityPositions?.[entity.id]?.x ?? 80) + 250,
            y: state.entityPositions?.[entity.id]?.y ?? 80,
          };
        const attribute = componentAttribute(component, parentAttribute.id);

        return {
          id,
          type: 'attribute',
          selectable: true,
          ...nodeDimensions(state.nodeSizes?.[id], NODE_SIZES.attribute),
          position: state.elementPositions?.[id] ?? {
            x: parentPosition.x + (index - (parentAttribute.components.length - 1) / 2) * 150,
            y: parentPosition.y - 100,
          },
          data: {
            nodeId: id,
            attribute,
            entityId: entity.id,
            size: nodeSize(state.nodeSizes?.[id], NODE_SIZES.attribute),
            minSize: MIN_NODE_SIZES.attribute,
            selected:
              state.selectedAttribute?.entityId === entity.id && state.selectedAttribute.attributeId === component.id,
            onSelectAttribute: callbacks.onSelectAttribute,
            onUpdateAttribute: callbacks.onUpdateAttribute,
            onResizeStart: callbacks.onResizeStart,
            onResize: callbacks.onResize,
            onResizeEnd: callbacks.onResizeEnd,
          } satisfies AttributeNodeData,
        };
      }),
    ),
  );
  const standaloneAttributeNodes = (model.standaloneAttributes ?? []).map((attribute) => ({
    id: `standalone:${attribute.id}`,
    type: 'attribute',
    ...nodeDimensions(state.nodeSizes?.[`standalone:${attribute.id}`], NODE_SIZES.attribute),
    position: state.elementPositions?.[`standalone:${attribute.id}`] ?? { x: 120, y: 120 },
    data: {
      nodeId: `standalone:${attribute.id}`,
      attribute,
      entityId: null,
      size: nodeSize(state.nodeSizes?.[`standalone:${attribute.id}`], NODE_SIZES.attribute),
      minSize: MIN_NODE_SIZES.attribute,
      selected: state.selectedAttribute?.entityId === null && state.selectedAttribute.attributeId === attribute.id,
      onSelectAttribute: callbacks.onSelectAttribute,
      onUpdateAttribute: callbacks.onUpdateAttribute,
      onResizeStart: callbacks.onResizeStart,
      onResize: callbacks.onResize,
      onResizeEnd: callbacks.onResizeEnd,
    } satisfies AttributeNodeData,
  }));

  const relationshipNodes = model.relationships.map((relationship, index) => {
    const positions = relationship.participants
      .map((participant) => state.entityPositions?.[participant.entityId])
      .filter((position): position is DiagramPosition => Boolean(position));
    const fallback = positions[0] ?? { x: 520 + (index % 2) * 220, y: 180 + Math.floor(index / 2) * 180 };
    const position =
      positions.length > 1
        ? { x: (positions[0].x + positions[1].x) / 2 + 100, y: (positions[0].y + positions[1].y) / 2 }
        : { x: fallback.x + 180, y: fallback.y + 30 };

    const id = `relationship:${relationship.id}`;
    const isGeneralization = relationship.kind === 'generalization' || relationship.kind === 'specialization';
    const defaultSize = isGeneralization ? DEFAULT_NODE_SIZES.generalization : NODE_SIZES.relationship;
    const minSize = isGeneralization ? MIN_NODE_SIZES.generalization : MIN_NODE_SIZES.relationship;

    return {
      id,
      type: 'relationship',
      ...nodeDimensions(state.nodeSizes?.[id], defaultSize),
      position: state.elementPositions?.[`relationship:${relationship.id}`] ?? position,
      data: {
        relationship,
        size: nodeSize(state.nodeSizes?.[id], defaultSize),
        minSize,
        onUpdateRelationship: callbacks.onUpdateRelationship,
        onResizeStart: callbacks.onResizeStart,
        onResize: callbacks.onResize,
        onResizeEnd: callbacks.onResizeEnd,
      } satisfies RelationshipNodeData,
    };
  });

  const relationshipAttributeNodes = model.relationships.flatMap((relationship) => {
    const relationshipNodeId = `relationship:${relationship.id}`;
    const relationshipPosition = state.elementPositions?.[relationshipNodeId] ?? { x: 520, y: 180 };

    return relationship.attributes.map((attribute, index) => ({
      id: `relationship-attribute:${relationship.id}:${attribute.id}`,
      type: 'attribute',
      selectable: true,
      ...nodeDimensions(
        state.nodeSizes?.[`relationship-attribute:${relationship.id}:${attribute.id}`],
        NODE_SIZES.attribute,
      ),
      position: state.elementPositions?.[`relationship-attribute:${relationship.id}:${attribute.id}`] ?? {
        x: relationshipPosition.x + index * 150,
        y: relationshipPosition.y + NODE_SIZES.attribute.height + 70,
      },
      data: {
        nodeId: `relationship-attribute:${relationship.id}:${attribute.id}`,
        attribute,
        entityId: null,
        size: nodeSize(
          state.nodeSizes?.[`relationship-attribute:${relationship.id}:${attribute.id}`],
          NODE_SIZES.attribute,
        ),
        minSize: MIN_NODE_SIZES.attribute,
        selected: state.selectedAttribute?.entityId === null && state.selectedAttribute.attributeId === attribute.id,
        onSelectAttribute: callbacks.onSelectAttribute,
        onUpdateAttribute: callbacks.onUpdateAttribute,
        onResizeStart: callbacks.onResizeStart,
        onResize: callbacks.onResize,
        onResizeEnd: callbacks.onResizeEnd,
      } satisfies AttributeNodeData,
    }));
  });

  return [
    ...entityNodes,
    ...attributeNodes,
    ...componentNodes,
    ...standaloneAttributeNodes,
    ...relationshipNodes,
    ...relationshipAttributeNodes,
  ];
}

export function buildFlowEdges(model: ConceptualModel, state: FlowMapperState, callbacks: FlowMapperCallbacks): Edge[] {
  const attributeEdges = model.entities.flatMap((entity) =>
    entity.attributes.map((attribute, index) => {
      const attributeId = `${entity.id}:${attribute.id}`;
      const entityPosition = state.entityPositions?.[entity.id] ?? fallbackEntityPosition(0);
      const attributePosition = state.elementPositions?.[attributeId] ?? {
        x: entityPosition.x + 250,
        y: entityPosition.y + index * 100,
      };
      const handles = getClosestConnectionHandles(
        entityPosition,
        NODE_SIZES.entity,
        attributePosition,
        NODE_SIZES.attribute,
        'entity',
        'attribute',
      );

      return {
        id: `attribute:${entity.id}:${attribute.id}`,
        source: entity.id,
        sourceHandle: attribute.entityHandle ?? handles.sourceHandle,
        target: attributeId,
        targetHandle: attribute.connectionHandle ?? handles.targetHandle,
        type: 'attribute',
        selectable: true,
        interactionWidth: 20,
      };
    }),
  );

  const allAttributes = [
    ...model.entities.flatMap((entity) => entity.attributes.map((attribute) => ({ entityId: entity.id, attribute }))),
    ...(model.standaloneAttributes ?? []).map((attribute) => ({ entityId: null, attribute })),
  ];
  const attributeHierarchyEdges = allAttributes.flatMap(({ entityId, attribute }) => {
    if (!attribute.parentAttributeId) return [];

    const parent = allAttributes.find((item) => item.attribute.id === attribute.parentAttributeId);
    if (!parent?.attribute.composite) return [];

    const source = entityId === null ? `standalone:${attribute.id}` : `${entityId}:${attribute.id}`;
    const target =
      parent.entityId === null ? `standalone:${parent.attribute.id}` : `${parent.entityId}:${parent.attribute.id}`;
    const sourcePosition = state.elementPositions?.[source] ?? { x: 0, y: 0 };
    const targetPosition = state.elementPositions?.[target] ?? { x: 0, y: 0 };
    const handles = getClosestConnectionHandles(
      sourcePosition,
      NODE_SIZES.attribute,
      targetPosition,
      NODE_SIZES.attribute,
      'attribute',
      'attribute',
    );

    return [
      {
        id: `attribute-parent:${entityId ?? 'standalone'}:${attribute.id}:${parent.entityId ?? 'standalone'}:${parent.attribute.id}`,
        source,
        sourceHandle: attribute.parentHandle ?? handles.sourceHandle,
        target,
        targetHandle: attribute.parentAttributeHandle ?? handles.targetHandle,
        type: 'attribute',
        selectable: true,
        interactionWidth: 20,
      },
    ];
  });
  const componentEdges = model.entities.flatMap((entity) =>
    entity.attributes.flatMap((parentAttribute) => {
      const target = `${entity.id}:${parentAttribute.id}`;
      const targetPosition = state.elementPositions?.[target] ?? { x: 0, y: 0 };

      return parentAttribute.components.map((component, index) => {
        const source = `${entity.id}:${component.id}`;
        const sourcePosition = state.elementPositions?.[source] ?? {
          x: targetPosition.x + index * 150,
          y: targetPosition.y - 100,
        };
        const handles = getClosestConnectionHandles(
          sourcePosition,
          NODE_SIZES.attribute,
          targetPosition,
          NODE_SIZES.attribute,
          'attribute',
          'attribute',
        );

        return {
          id: `attribute-component:${entity.id}:${parentAttribute.id}:${component.id}`,
          source,
          sourceHandle: handles.sourceHandle,
          target,
          targetHandle: handles.targetHandle,
          type: 'attribute',
          selectable: true,
          interactionWidth: 20,
        };
      });
    }),
  );

  const relationshipEdges = model.relationships.flatMap((relationship) =>
    relationship.participants.map((participant, index) => {
      // Modelos criados antes dos handles direcionais usam o primeiro participante
      // entrando pelo lado esquerdo e o segundo saindo pelo lado direito.
      const startsAtRelationship =
        participant.connectionDirection === 'relationship-to-entity' ||
        (!participant.connectionDirection && index === 1);
      const relationshipHandle =
        participant.connectionHandle ?? (startsAtRelationship ? 'source-right' : 'target-left');

      return {
        id: `${relationship.id}:${participant.entityId}`,
        source: startsAtRelationship ? `relationship:${relationship.id}` : participant.entityId,
        sourceHandle: startsAtRelationship ? relationshipHandle : (participant.entityHandle ?? 'entity-right'),
        target: startsAtRelationship ? participant.entityId : `relationship:${relationship.id}`,
        targetHandle: startsAtRelationship ? (participant.entityHandle ?? 'entity-left') : relationshipHandle,
        type: 'relationship',
        selectable: true,
        interactionWidth: 20,
        data: {
          relationship,
          entityId: participant.entityId,
          onCycleRelationshipCardinality: callbacks.onCycleRelationshipCardinality ?? (() => undefined),
        } satisfies RelationshipEdgeData,
      };
    }),
  );

  const attributeRelationshipEdges = allAttributes.flatMap(({ entityId, attribute }) => {
    if (
      !attribute.relationshipId ||
      !model.relationships.some((relationship) => relationship.id === attribute.relationshipId)
    ) {
      return [];
    }

    const attributeNodeId = entityId === null ? `standalone:${attribute.id}` : `${entityId}:${attribute.id}`;
    return [
      {
        id: `attribute-relationship:${attribute.relationshipId}:${entityId ?? 'standalone'}:${attribute.id}`,
        source: attributeNodeId,
        sourceHandle: attribute.relationshipAttributeHandle ?? 'attribute-right',
        target: `relationship:${attribute.relationshipId}`,
        targetHandle: attribute.relationshipHandle ?? 'target-left',
        type: 'attribute',
        selectable: true,
        interactionWidth: 20,
      },
    ];
  });
  const generatedRelationshipAttributeEdges = model.relationships.flatMap((relationship) =>
    relationship.attributes.map((attribute, index) => {
      const attributeNodeId = `relationship-attribute:${relationship.id}:${attribute.id}`;
      const relationshipNodeId = `relationship:${relationship.id}`;
      const relationshipPosition = state.elementPositions?.[relationshipNodeId] ?? { x: 0, y: 0 };
      const attributePosition = state.elementPositions?.[attributeNodeId] ?? {
        x: relationshipPosition.x + index * 150,
        y: relationshipPosition.y + NODE_SIZES.attribute.height + 70,
      };
      const handles = getClosestConnectionHandles(
        attributePosition,
        NODE_SIZES.attribute,
        relationshipPosition,
        NODE_SIZES.relationship,
        'attribute',
        'relationship',
      );

      return {
        id: `relationship-attribute-edge:${relationship.id}:${attribute.id}`,
        source: attributeNodeId,
        sourceHandle: handles.sourceHandle,
        target: relationshipNodeId,
        targetHandle: relationshipHandleForSide(handles.targetHandle.replace('relationship-', '') as ConnectionSide),
        type: 'attribute',
        selectable: true,
        interactionWidth: 20,
      };
    }),
  );

  return [
    ...attributeEdges,
    ...attributeHierarchyEdges,
    ...componentEdges,
    ...attributeRelationshipEdges,
    ...generatedRelationshipAttributeEdges,
    ...relationshipEdges,
  ];
}

function relationshipHandleForSide(side: ConnectionSide): string {
  const handles: Record<ConnectionSide, string> = {
    left: 'target-left',
    right: 'source-right',
    top: 'source-top',
    bottom: 'source-bottom',
  };
  return handles[side];
}

function componentAttribute(
  component: { id: string; name: string; type: Attribute['type'] },
  parentAttributeId: string,
): Attribute {
  return {
    id: component.id,
    name: component.name,
    type: component.type,
    identifier: false,
    required: false,
    unique: false,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
    kind: 'subattribute',
    parentAttributeId,
  };
}

function nodeSize(size: NodeSize | undefined, fallback: NodeSize): NodeSize {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
    ? size
    : fallback;
}

function nodeDimensions(size: NodeSize | undefined, fallback: NodeSize) {
  const dimensions = nodeSize(size, fallback);
  return {
    width: dimensions.width,
    height: dimensions.height,
    initialWidth: dimensions.width,
    initialHeight: dimensions.height,
    style: { width: dimensions.width, height: dimensions.height },
  };
}
