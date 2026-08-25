import { useState } from 'react';

import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import type { Attribute, Cardinality, ConceptualModel, Entity, LogicalModel, Relationship } from '../types';

const defaultDescription =
  'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome, email e telefone. O pedido possui data e valor total.';

export function useDiagramEditor() {
  const [description, setDescription] = useState(defaultDescription);
  const [conceptualModel, setConceptualModel] = useState<ConceptualModel | null>(null);
  const [logicalModel, setLogicalModel] = useState<LogicalModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityPositions, setEntityPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedAttribute, setSelectedAttribute] = useState<{
    entityId: string;
    attributeId: string;
  } | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  async function generateConceptualDiagram() {
    setError(null);
    setLogicalModel(null);
    setIsGenerating(true);

    try {
      const model = await generateConceptualModel(description);

      setConceptualModel(model);
      setSelectedAttribute(null);
      setSelectedEntityIds([]);
      setEntityPositions({});
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo conceitual.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function convertConceptualToLogicalDiagram() {
    if (!conceptualModel) {
      return;
    }

    setError(null);
    setIsConverting(true);

    try {
      const model = await convertToLogicalModel(conceptualModel);

      setLogicalModel(model);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo lógico.');
    } finally {
      setIsConverting(false);
    }
  }

  function clearLogicalModel() {
    setLogicalModel(null);
  }

  function clearDiagram() {
    setConceptualModel(null);
    setLogicalModel(null);
    setError(null);
    setSelectedAttribute(null);
    setSelectedEntityIds([]);
    setEntityPositions({});
  }

  function createEntityId(name: string) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  function addEntity() {
    const entityNumber = (conceptualModel?.entities.length ?? 0) + 1;

    const entityName = `Nova Entidade ${entityNumber}`;

    const newEntity = {
      id: createEntityId(entityName),
      name: entityName,
      description: 'Entidade adicionada manualmente pelo usuário.',
      attributes: [],
    };

    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return {
          metadata: {
            title: 'Modelo conceitual',
            description: 'Modelo criado manualmente pelo usuário.',
            generatedBy: 'user',
            generatedAt: new Date().toISOString(),
          },
          entities: [newEntity],
          relationships: [],
          ambiguities: [],
        };
      }

      return {
        ...currentModel,
        entities: [...currentModel.entities, newEntity],
      };
    });

    setSelectedEntityIds([newEntity.id]);
    setLogicalModel(null);
  }

  function removeEntity(entityId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.filter((entity) => entity.id !== entityId),
        relationships: currentModel.relationships.filter((relationship) =>
          relationship.participants.every((participant) => participant.entityId !== entityId),
        ),
      };
    });

    setSelectedAttribute((currentSelection) => (currentSelection?.entityId === entityId ? null : currentSelection));
    setSelectedEntityIds((currentSelection) => currentSelection.filter((selectedId) => selectedId !== entityId));
    setEntityPositions((currentPositions) => {
      const { [entityId]: _removedPosition, ...remainingPositions } = currentPositions;
      return remainingPositions;
    });
    setLogicalModel(null);
  }

  function updateEntityPosition(entityId: string, position: { x: number; y: number }) {
    setEntityPositions((currentPositions) => ({
      ...currentPositions,
      [entityId]: position,
    }));
  }

  function selectEntity(entityId: string) {
    setSelectedEntityIds((currentSelection) => {
      if (currentSelection.includes(entityId)) {
        return currentSelection;
      }

      return currentSelection.length < 2 ? [...currentSelection, entityId] : [currentSelection[1], entityId];
    });
    setSelectedAttribute(null);
  }

  function clearEntitySelection() {
    setSelectedEntityIds([]);
  }

  function updateEntity(entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) => (entity.id === entityId ? { ...entity, ...changes } : entity)),
      };
    });

    setLogicalModel(null);
  }

  function createRelationship(entityIds: string[], name = 'novoRelacionamento', type: Cardinality = '1:N') {
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

      const participantsCardinality = type === '1:1' ? ['1', '1'] : type === '1:N' ? ['1', 'N'] : ['N', 'N'];
      const baseId = `relationship_${createEntityId(relationshipName)}`;
      let relationshipId = baseId;
      let suffix = 2;

      while (currentModel.relationships.some((relationship) => relationship.id === relationshipId)) {
        relationshipId = `${baseId}_${suffix}`;
        suffix += 1;
      }

      return {
        ...currentModel,
        relationships: [
          ...currentModel.relationships,
          {
            id: relationshipId,
            name: relationshipName,
            type,
            participants: entityIds.map((entityId, index) => ({
              entityId,
              cardinality: participantsCardinality[index] as '1' | 'N',
            })),
            attributes: [],
          },
        ],
      };
    });

    setSelectedEntityIds([]);
    setLogicalModel(null);
  }

  function createRelationshipFromConnection(sourceEntityId: string, targetEntityId: string) {
    createRelationship([sourceEntityId, targetEntityId]);
  }

  function updateRelationship(relationshipId: string, changes: Partial<Pick<Relationship, 'name'>>) {
    if (changes.name !== undefined && !changes.name.trim()) {
      return;
    }

    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        relationships: currentModel.relationships.map((relationship) =>
          relationship.id === relationshipId ? { ...relationship, ...changes } : relationship,
        ),
      };
    });

    setLogicalModel(null);
  }

  function removeRelationship(relationshipId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        relationships: currentModel.relationships.filter((relationship) => relationship.id !== relationshipId),
      };
    });

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
          const [first, second] = participants;
          const type: Cardinality =
            first.cardinality === '1' && second.cardinality === '1'
              ? '1:1'
              : first.cardinality === 'N' && second.cardinality === 'N'
                ? 'N:N'
                : '1:N';

          return { ...relationship, type, participants };
        }),
      };
    });

    setLogicalModel(null);
  }

  function createAttributeId(entityId: string, name: string) {
    return `${entityId}_${name}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  function addAttribute(entityId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) => {
          if (entity.id !== entityId) {
            return entity;
          }

          const attributeNumber = entity.attributes.length + 1;
          const attributeName = `novoAtributo${attributeNumber}`;

          return {
            ...entity,
            attributes: [
              ...entity.attributes,
              {
                id: createAttributeId(entity.id, attributeName),
                name: attributeName,
                type: 'string',
                description: 'Atributo adicionado manualmente pelo usuário.',
                identifier: false,
                required: false,
                unique: false,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
            ],
          };
        }),
      };
    });

    setLogicalModel(null);
  }

  function selectAttribute(entityId: string, attributeId: string) {
    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId
        ? null
        : { entityId, attributeId },
    );
  }

  function updateAttribute(entityId: string, attributeId: string, changes: Partial<Attribute>) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) =>
          entity.id !== entityId
            ? entity
            : {
                ...entity,
                attributes: entity.attributes.map((attribute) =>
                  attribute.id === attributeId ? { ...attribute, ...changes } : attribute,
                ),
              },
        ),
      };
    });

    setLogicalModel(null);
  }

  function removeAttribute(entityId: string, attributeId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) =>
          entity.id !== entityId
            ? entity
            : { ...entity, attributes: entity.attributes.filter((attribute) => attribute.id !== attributeId) },
        ),
      };
    });

    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId ? null : currentSelection,
    );
    setLogicalModel(null);
  }

  return {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical: !!conceptualModel,
    selectedAttribute,
    selectedEntityIds,
    entityPositions,
    setDescription,
    setConceptualModel,
    setLogicalModel,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    clearLogicalModel,
    clearDiagram,
    addEntity,
    removeEntity,
    updateEntityPosition,
    selectEntity,
    clearEntitySelection,
    updateEntity,
    createRelationship,
    createRelationshipFromConnection,
    updateRelationship,
    removeRelationship,
    cycleRelationshipCardinality,
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
  };
}
