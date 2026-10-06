import { AttributeEdge } from './edges/AttributeEdge';
import { RelationshipEdge } from './edges/RelationshipEdge';
import { AttributeNode } from './nodes/AttributeNode';
import { EntityNode } from './nodes/EntityNode';
import { RelationshipNode } from './nodes/RelationshipNode';

/** Renderizadores compartilhados pelo canvas e por previews somente leitura. */
export const conceptualNodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
  relationship: RelationshipNode,
};

export const conceptualEdgeTypes = {
  attribute: AttributeEdge,
  relationship: RelationshipEdge,
};
