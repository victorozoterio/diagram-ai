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
type GeneralizationRole = 'supertype' | 'subtype';

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
    const isGeneralization = kind === 'generalization' || kind === 'specialization';
    if ((isGeneralization ? entityIds.length < 2 : entityIds.length !== 2) || !relationshipName) {
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
        name: isGeneralization ? 'Gen' : relationshipName,
        type,
        kind,
        participants: isGeneralization
          ? []
          : entityIds.map((entityId, index) => ({
              entityId,
              cardinality: cardinalities[index] as '1' | 'N',
              entityHandle: entityHandles?.[index],
              connectionDirection: connectionDirections?.[index],
            })),
        attributes: [],
        ...(isGeneralization
          ? {
              supertypeId: entityIds[0],
              subtypeIds: entityIds.slice(1),
            }
          : {}),
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
          if (relationship.id !== relationshipId) {
            return relationship;
          }

          const existingParticipant = relationship.participants.find(
            (participant) => participant.entityId === entityId,
          );
          if (existingParticipant) {
            return {
              ...relationship,
              participants: relationship.participants.map((participant) =>
                participant.entityId === entityId
                  ? { ...participant, connectionHandle, entityHandle, connectionDirection }
                  : participant,
              ),
            };
          }

          if (relationship.participants.length >= 2) return relationship;

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

  function connectEntityToGeneralization(
    relationshipId: string,
    entityId: string,
    role: GeneralizationRole,
    connectionHandle?: string,
    entityHandle?: string,
  ) {
    setConceptualModel((currentModel) => {
      const entityExists = currentModel?.entities.some((entity) => entity.id === entityId);
      if (!currentModel || !entityExists) return currentModel;

      return {
        ...currentModel,
        relationships: currentModel.relationships.map((relationship) => {
          if (relationship.id !== relationshipId || !isGeneralization(relationship)) return relationship;

          if (role === 'supertype') {
            if (relationship.supertypeId && relationship.supertypeId !== entityId) return relationship;
            if (relationship.subtypeIds?.includes(entityId)) return relationship;

            return {
              ...relationship,
              supertypeId: entityId,
              supertypeHandles: { connectionHandle, entityHandle },
            };
          }

          if (entityId === relationship.supertypeId || relationship.subtypeIds?.includes(entityId)) return relationship;

          return {
            ...relationship,
            subtypeIds: [...(relationship.subtypeIds ?? []), entityId],
            subtypeHandles: {
              ...(relationship.subtypeHandles ?? {}),
              [entityId]: { connectionHandle, entityHandle },
            },
          };
        }),
      };
    });
    setLogicalModel(null);
  }

  function disconnectEntityFromGeneralization(relationshipId: string, entityId: string, role: GeneralizationRole) {
    setConceptualModel((currentModel) => {
      if (!currentModel) return currentModel;

      return {
        ...currentModel,
        relationships: currentModel.relationships.map((relationship) => {
          if (relationship.id !== relationshipId || !isGeneralization(relationship)) return relationship;

          if (role === 'supertype') {
            return { ...relationship, supertypeId: undefined, supertypeHandles: undefined };
          }

          const { [entityId]: _removed, ...remainingHandles } = relationship.subtypeHandles ?? {};
          return {
            ...relationship,
            subtypeIds: (relationship.subtypeIds ?? []).filter((subtypeId) => subtypeId !== entityId),
            subtypeHandles: remainingHandles,
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
    connectEntityToGeneralization,
    disconnectEntityFromGeneralization,
  };
}

function isGeneralization(relationship: Relationship) {
  return relationship.kind === 'generalization' || relationship.kind === 'specialization';
}
