import type { Relationship } from '../../types';

export function relationshipCardinalityForEntity(relationship: Relationship, entityId: string): '1' | 'N' | undefined {
  return relationship.participants.find((participant) => participant.entityId === entityId)?.cardinality;
}
