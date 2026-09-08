import type { AttributeType, ConceptualModel, ElementKind, Entity, Relationship } from '../../types';

export type DiagramPosition = { x: number; y: number };

export type EntityNodeData = Pick<Entity, 'id' | 'name' | 'kind'> & {
  isSelected?: boolean;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
};

export type AttributeNodeData = {
  attribute: Entity['attributes'][number];
  entityId: string | null;
  selected?: boolean;
  onSelectAttribute?: (entityId: string | null, attributeId: string) => void;
  onUpdateAttribute?: (
    entityId: string | null,
    attributeId: string,
    changes: { name?: string; type?: AttributeType },
  ) => void;
};

export type RelationshipNodeData = {
  relationship: Relationship;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
};

export type RelationshipEdgeData = {
  relationship: Relationship;
  entityId: string;
  onCycleRelationshipCardinality: (relationshipId: string, entityId: string) => void;
};

export type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
  onRemoveEntity?: (entityId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onClearSelection?: () => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  selectedEntityIds?: string[];
  layoutVersion?: number;
  entityPositions?: Record<string, DiagramPosition>;
  elementPositions?: Record<string, DiagramPosition>;
  selectedAttribute?: { entityId: string | null; attributeId: string } | null;
  onUpdateEntityPosition?: (entityId: string, position: DiagramPosition) => void;
  onUpdateElementPosition?: (elementId: string, position: DiagramPosition) => void;
  onSelectAttribute?: (entityId: string | null, attributeId: string) => void;
  onUpdateAttribute?: (
    entityId: string | null,
    attributeId: string,
    changes: { name?: string; type?: AttributeType },
  ) => void;
  onRemoveAttribute?: (entityId: string | null, attributeId: string) => void;
  onConnectAttributeToEntity?: (
    sourceEntityId: string | null,
    attributeId: string,
    targetEntityId: string,
    entityHandle?: string,
    attributeHandle?: string,
  ) => void;
  onConnectAttributeToAttribute?: (
    sourceEntityId: string | null,
    sourceAttributeId: string,
    targetEntityId: string | null,
    targetAttributeId: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => void;
  onDisconnectAttributeFromEntity?: (entityId: string, attributeId: string) => void;
  onDisconnectAttributeFromAttribute?: (
    entityId: string | null,
    attributeId: string,
    parentAttributeId: string,
  ) => void;
  onDisconnectEntityFromRelationship?: (relationshipId: string, entityId: string) => void;
  onConnectEntities?: (
    sourceEntityId: string,
    targetEntityId: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => void;
  onConnectEntityToRelationship?: (
    relationshipId: string,
    entityId: string,
    connectionHandle?: string,
    entityHandle?: string,
    connectionDirection?: 'entity-to-relationship' | 'relationship-to-entity',
  ) => void;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
  onRemoveRelationship?: (relationshipId: string) => void;
  onCycleRelationshipCardinality?: (relationshipId: string, entityId: string) => void;
  onAddElementAtPosition?: (kind: ElementKind, position: DiagramPosition, targetEntityId?: string) => void;
};
