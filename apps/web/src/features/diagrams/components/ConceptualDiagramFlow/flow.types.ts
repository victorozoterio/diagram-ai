import type { DiagramSize, EdgeControlPoints } from '../../hooks/editor/editor.types';
import type { AttributeType, ConceptualModel, ElementKind, Entity, Relationship } from '../../types';

export type DiagramPosition = { x: number; y: number };

export type EntityNodeData = Pick<Entity, 'id' | 'name' | 'kind'> & {
  size: DiagramSize;
  minSize: DiagramSize;
  isSelected?: boolean;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  onResizeStart?: (nodeId: string) => void;
  onResize?: (nodeId: string, size: DiagramSize) => void;
  onResizeEnd?: (nodeId: string, size: DiagramSize) => void;
};

export type AttributeNodeData = {
  nodeId: string;
  attribute: Entity['attributes'][number];
  entityId: string | null;
  size: DiagramSize;
  minSize: DiagramSize;
  selected?: boolean;
  onSelectAttribute?: (entityId: string | null, attributeId: string) => void;
  onUpdateAttribute?: (
    entityId: string | null,
    attributeId: string,
    changes: { name?: string; type?: AttributeType },
  ) => void;
  onResizeStart?: (nodeId: string) => void;
  onResize?: (nodeId: string, size: DiagramSize) => void;
  onResizeEnd?: (nodeId: string, size: DiagramSize) => void;
};

export type RelationshipNodeData = {
  relationship: Relationship;
  size: DiagramSize;
  minSize: DiagramSize;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
  onResizeStart?: (nodeId: string) => void;
  onResize?: (nodeId: string, size: DiagramSize) => void;
  onResizeEnd?: (nodeId: string, size: DiagramSize) => void;
};

export type RelationshipEdgeData = {
  relationship: Relationship;
  entityId: string;
  isGeneralization?: boolean;
  generalizationRole?: 'supertype' | 'subtype';
  onCycleRelationshipCardinality: (relationshipId: string, entityId: string) => void;
} & EditableEdgeData;

export type EditableEdgeData = {
  sourceHandleId?: string;
  targetHandleId?: string;
  sourceAnchor?: DiagramAnchor;
  targetAnchor?: DiagramAnchor;
  controlPoints?: EdgeControlPoints;
  onControlPointsChange?: (edgeId: string, controlPoints: EdgeControlPoints) => void;
  onControlPointsCommit?: (edgeId: string, controlPoints: EdgeControlPoints) => void;
  onReconnect?: (connection: EdgeReconnectConnection) => boolean;
};

export type DiagramAnchor = {
  xRatio: number;
  yRatio: number;
};

export type EdgeReconnectConnection = {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
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
  nodeSizes?: Record<string, DiagramSize>;
  edgeControlPoints?: Record<string, EdgeControlPoints>;
  selectedAttribute?: { entityId: string | null; attributeId: string } | null;
  onUpdateEntityPosition?: (entityId: string, position: DiagramPosition) => void;
  onUpdateElementPosition?: (elementId: string, position: DiagramPosition) => void;
  onUpdateNodeSize?: (nodeId: string, size: DiagramSize) => void;
  onUpdateEdgeControlPoints?: (edgeId: string, controlPoints: EdgeControlPoints) => void;
  onRemoveEdgeControlPoints?: (edgeIds: string[]) => void;
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
  onConnectAttributeToRelationship?: (
    sourceEntityId: string | null,
    attributeId: string,
    relationshipId: string,
    relationshipHandle?: string,
    attributeHandle?: string,
  ) => void;
  onDisconnectAttributeFromRelationship?: (
    relationshipId: string,
    entityId: string | null,
    attributeId: string,
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
  onConnectEntityToGeneralization?: (
    relationshipId: string,
    entityId: string,
    role: 'supertype' | 'subtype',
    connectionHandle?: string,
    entityHandle?: string,
  ) => void;
  onDisconnectEntityFromGeneralization?: (
    relationshipId: string,
    entityId: string,
    role: 'supertype' | 'subtype',
  ) => void;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
  onRemoveRelationship?: (relationshipId: string) => void;
  onCycleRelationshipCardinality?: (relationshipId: string, entityId: string) => void;
  onAddElementAtPosition?: (kind: ElementKind, position: DiagramPosition, targetEntityId?: string) => void;
};
