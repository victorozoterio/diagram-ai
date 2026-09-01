import type { ConceptualModel, LogicalModel, Relationship } from '../../types';
import type { DiagramPosition, StateSetter } from './editor.types';
import { relationshipPositionKey, resolveRelationshipCardinality } from './model-factories';
import { removeRelationshipFromModel, updateRelationshipInModel } from './model-operations';

type RelationshipEditingDependencies = {
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
};

export function useRelationshipEditingActions({
  setConceptualModel,
  setLogicalModel,
  setElementPositions,
}: RelationshipEditingDependencies) {
  function updateRelationship(relationshipId: string, changes: Partial<Pick<Relationship, 'name'>>) {
    if (changes.name !== undefined && !changes.name.trim()) {
      return;
    }

    setConceptualModel((currentModel) =>
      currentModel ? updateRelationshipInModel(currentModel, relationshipId, changes) : currentModel,
    );
    setLogicalModel(null);
  }

  function removeRelationship(relationshipId: string) {
    setConceptualModel((currentModel) =>
      currentModel ? removeRelationshipFromModel(currentModel, relationshipId) : currentModel,
    );
    setElementPositions(({ [relationshipPositionKey(relationshipId)]: _removed, ...remaining }) => remaining);
    setLogicalModel(null);
  }

  function cycleRelationshipCardinality(relationshipId: string, entityId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        relationships: currentModel.relationships.map((relationship) => {
          if (relationship.id !== relationshipId) {
            return relationship;
          }

          const participants = relationship.participants.map((participant) =>
            participant.entityId === entityId
              ? {
                  ...participant,
                  cardinality: (participant.cardinality === '1' ? 'N' : '1') as '1' | 'N',
                }
              : participant,
          );

          return {
            ...relationship,
            participants,
            type: resolveRelationshipCardinality(participants),
          };
        }),
      };
    });
    setLogicalModel(null);
  }

  return {
    updateRelationship,
    removeRelationship,
    cycleRelationshipCardinality,
  };
}
