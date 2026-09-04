import type { Edge, Node } from '@xyflow/react';
import type { ConceptualModel } from '../../types';
import type {
  AttributeNodeData,
  DiagramPosition,
  EntityNodeData,
  RelationshipEdgeData,
  RelationshipNodeData,
} from './flow.types';

type FlowMapperCallbacks = {
  onSelectEntity?: EntityNodeData['onSelectEntity'];
  onUpdateEntity?: EntityNodeData['onUpdateEntity'];
  onSelectAttribute?: AttributeNodeData['onSelectAttribute'];
  onUpdateAttribute?: AttributeNodeData['onUpdateAttribute'];
  onUpdateRelationship?: RelationshipNodeData['onUpdateRelationship'];
  onCycleRelationshipCardinality?: RelationshipEdgeData['onCycleRelationshipCardinality'];
};

type FlowMapperState = {
  entityPositions?: Record<string, DiagramPosition>;
  elementPositions?: Record<string, DiagramPosition>;
  selectedEntityIds?: string[];
  selectedAttribute?: { entityId: string | null; attributeId: string } | null;
};

const NODE_SIZES = {
  entity: { width: 170, height: 64 },
  attribute: { width: 132, height: 68 },
};

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
    position: state.entityPositions?.[entity.id] ?? fallbackEntityPosition(index),
    data: {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      isSelected: state.selectedEntityIds?.at(-1) === entity.id && !state.selectedAttribute,
      onSelectEntity: callbacks.onSelectEntity,
      onUpdateEntity: callbacks.onUpdateEntity,
    } satisfies EntityNodeData,
  }));

  const attributeNodes = model.entities.flatMap((entity) =>
    entity.attributes.map((attribute, index) => ({
      id: `${entity.id}:${attribute.id}`,
      type: 'attribute',
      selectable: true,
      position: state.elementPositions?.[`${entity.id}:${attribute.id}`] ?? {
        x: (state.entityPositions?.[entity.id]?.x ?? 80) + 250,
        y: (state.entityPositions?.[entity.id]?.y ?? 80) + index * 100,
      },
      data: {
        attribute,
        entityId: entity.id,
        selected:
          state.selectedAttribute?.entityId === entity.id && state.selectedAttribute.attributeId === attribute.id,
        onSelectAttribute: callbacks.onSelectAttribute,
        onUpdateAttribute: callbacks.onUpdateAttribute,
      } satisfies AttributeNodeData,
    })),
  );
  const standaloneAttributeNodes = (model.standaloneAttributes ?? []).map((attribute) => ({
    id: `standalone:${attribute.id}`,
    type: 'attribute',
    position: state.elementPositions?.[`standalone:${attribute.id}`] ?? { x: 120, y: 120 },
    data: {
      attribute,
      entityId: null,
      selected: state.selectedAttribute?.entityId === null && state.selectedAttribute.attributeId === attribute.id,
      onSelectAttribute: callbacks.onSelectAttribute,
      onUpdateAttribute: callbacks.onUpdateAttribute,
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

    return {
      id: `relationship:${relationship.id}`,
      type: 'relationship',
      position: state.elementPositions?.[`relationship:${relationship.id}`] ?? position,
      data: { relationship, onUpdateRelationship: callbacks.onUpdateRelationship } satisfies RelationshipNodeData,
    };
  });

  return [...entityNodes, ...attributeNodes, ...standaloneAttributeNodes, ...relationshipNodes];
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

  return [...attributeEdges, ...relationshipEdges];
}
