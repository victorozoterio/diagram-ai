import type { Cardinality, ConceptualModel, LogicalModel, Relationship } from '../../types';
import type { DiagramPosition, StateSetter } from './editor.types';
import {
  createEmptyConceptualModel,
  createSlug,
  createStandaloneRelationship,
  relationshipPositionKey,
  resolveRelationshipCardinality,
} from './model-factories';

type ConnectionDirection = 'entity-to-relationship' | 'relationship-to-entity';

type RelationshipCreationDependencies = {
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedEntityIds: StateSetter<string[]>;
};

export function useRelationshipCreationActions({
  setConceptualModel,
  setLogicalModel,
  setElementPositions,
  setSelectedEntityIds,
}: RelationshipCreationDependencies) {
  function createRelationship(
    entityIds: string[],
    name = 'Rel',
    type: Cardinality = '1:N',
    kind: Relationship['kind'] = 'relationship',
    entityHandles?: Array<string | undefined>,
    connectionDirections?: Array<ConnectionDirection | undefined>,
  ) {
    const relationshipName = name.trim();
    if (entityIds.length !== 2 || !relationshipName) {
      return;
    }

    setConceptualModel((currentModel) => {
      if (
        !currentModel ||
        entityIds.some((entityId) => !currentModel.entities.some((entity) => entity.id === entityId))
      ) {
        return currentModel;
      }

      const cardinalities = type === '1:1' ? ['1', '1'] : type === '1:N' ? ['1', 'N'] : ['N', 'N'];
      const baseId = `relationship_${createSlug(relationshipName)}`;
      let id = baseId;
      let suffix = 2;
      while (currentModel.relationships.some((relationship) => relationship.id === id)) {
        id = `${baseId}_${suffix}`;
        suffix += 1;
      }

      const relationship: Relationship = {
        id,
        name: relationshipName,
        type,
        kind,
        participants: entityIds.map((entityId, index) => ({
          entityId,
          cardinality: cardinalities[index] as '1' | 'N',
          entityHandle: entityHandles?.[index],
          connectionDirection: connectionDirections?.[index],
        })),
        attributes: [],
      };

      return { ...currentModel, relationships: [...currentModel.relationships, relationship] };
    });

    setSelectedEntityIds([]);
    setLogicalModel(null);
  }

  function createRelationshipFromConnection(
    sourceEntityId: string,
    targetEntityId: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) {
    createRelationship(
      [sourceEntityId, targetEntityId],
      undefined,
      undefined,
      undefined,
      [sourceHandle, targetHandle],
      ['entity-to-relationship', 'relationship-to-entity'],
    );
  }

  function addStandaloneRelationship(kind: Relationship['kind'], position: DiagramPosition) {
    const relationship = createStandaloneRelationship(kind);

    setConceptualModel((currentModel) => ({
      ...(currentModel ?? createEmptyConceptualModel()),
      relationships: [...(currentModel?.relationships ?? []), relationship],
    }));
    setElementPositions((currentPositions) => ({
      ...currentPositions,
      [relationshipPositionKey(relationship.id)]: position,
    }));
    setLogicalModel(null);
  }

  function connectEntityToRelationship(
    relationshipId: string,
    entityId: string,
    connectionHandle?: string,
    entityHandle?: string,
    connectionDirection?: ConnectionDirection,
  ) {
    setConceptualModel((currentModel) => {
      if (!currentModel?.entities.some((entity) => entity.id === entityId)) {
        return currentModel;
      }

      return {
        ...currentModel,
        relationships: currentModel.relationships.map((relationship) => {
          if (
            relationship.id !== relationshipId ||
            relationship.participants.some((participant) => participant.entityId === entityId) ||
            relationship.participants.length >= 2
          ) {
            return relationship;
          }

          const participants = [
            ...relationship.participants,
            {
              entityId,
              cardinality: (relationship.participants.length === 0 ? '1' : 'N') as '1' | 'N',
              connectionHandle,
              entityHandle,
              connectionDirection,
            },
          ];

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
    createRelationship,
    createRelationshipFromConnection,
    addStandaloneRelationship,
    connectEntityToRelationship,
  };
}
