import { useState } from 'react';

import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import type {
  Attribute,
  Cardinality,
  ConceptualModel,
  ElementKind,
  Entity,
  EntityKind,
  LogicalModel,
  Relationship,
} from '../types';

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
  const [elementPositions, setElementPositions] = useState<Record<string, { x: number; y: number }>>({});
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
      setElementPositions({});
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
    setElementPositions({});
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

  function addEntity(kind: EntityKind = 'regular', position?: { x: number; y: number }) {
    const entityNumber = (conceptualModel?.entities.length ?? 0) + 1;

    const entityLabel =
      kind === 'weak' ? 'Entidade Fraca' : kind === 'associative' ? 'Entidade Associativa' : 'Nova Entidade';
    const entityName = `${entityLabel} ${entityNumber}`;

    const newEntity = {
      id: createEntityId(entityName),
      name: entityName,
      description: 'Entidade adicionada manualmente pelo usuário.',
      kind,
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
    if (position) {
      setEntityPositions((currentPositions) => ({ ...currentPositions, [newEntity.id]: position }));
    }
    setLogicalModel(null);
  }

  function addEntityAtPosition(kind: EntityKind, position: { x: number; y: number }) {
    addEntity(kind, position);
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
    setElementPositions((currentPositions) =>
      Object.fromEntries(Object.entries(currentPositions).filter(([key]) => !key.startsWith(`${entityId}:`))),
    );
    setLogicalModel(null);
  }

  function updateEntityPosition(entityId: string, position: { x: number; y: number }) {
    setEntityPositions((currentPositions) => ({
      ...currentPositions,
      [entityId]: position,
    }));
  }

  function updateElementPosition(elementId: string, position: { x: number; y: number }) {
    setElementPositions((currentPositions) => ({ ...currentPositions, [elementId]: position }));
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

  function createRelationship(
    entityIds: string[],
    name = 'novoRelacionamento',
    type: Cardinality = '1:N',
    kind: Relationship['kind'] = 'relationship',
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
            kind,
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

  function addElementAtPosition(kind: ElementKind, position: { x: number; y: number }, targetEntityId?: string) {
    if (kind === 'entity' || kind === 'weak-entity' || kind === 'associative-entity') {
      addEntity(kind === 'weak-entity' ? 'weak' : kind === 'associative-entity' ? 'associative' : 'regular', position);
      return;
    }

    const attributeKinds: ElementKind[] = [
      'simple-attribute',
      'multivalued-attribute',
      'composite-attribute',
      'derived-attribute',
      'identifier-attribute',
      'subattribute',
    ];

    if (attributeKinds.includes(kind)) {
      const targetId = targetEntityId ?? (selectedEntityIds.length === 1 ? selectedEntityIds[0] : undefined);
      if (targetId) {
        addAttribute(targetId, kind === 'subattribute' ? 'simple-attribute' : kind, position);
      }
      return;
    }

    const relationshipKinds: ElementKind[] = [
      'relationship',
      'identifying-relationship',
      'one-to-one',
      'one-to-many',
      'many-to-many',
      'generalization',
      'specialization',
      'generalization-specialization',
    ];

    if (relationshipKinds.includes(kind) && targetEntityId && selectedEntityIds.length > 0) {
      const entityIds =
        selectedEntityIds.length >= 2 ? selectedEntityIds.slice(0, 2) : [selectedEntityIds[0], targetEntityId];
      if (entityIds[0] !== entityIds[1]) {
        const relationshipType: Cardinality = kind === 'one-to-one' ? '1:1' : kind === 'many-to-many' ? 'N:N' : '1:N';
        const relationshipKind =
          kind === 'generalization-specialization'
            ? 'generalization'
            : kind === 'generalization' || kind === 'specialization' || kind === 'identifying-relationship'
              ? kind
              : 'relationship';
        createRelationship(entityIds, undefined, relationshipType, relationshipKind);
      }
    }
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

  function addAttribute(entityId: string, kind: ElementKind = 'simple-attribute', position?: { x: number; y: number }) {
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
                identifier: kind === 'identifier-attribute',
                required: false,
                unique: false,
                multivalued: kind === 'multivalued-attribute',
                composite: kind === 'composite-attribute',
                derived: kind === 'derived-attribute',
                components: [],
                kind:
                  kind === 'multivalued-attribute'
                    ? 'multivalued'
                    : kind === 'composite-attribute'
                      ? 'composite'
                      : kind === 'derived-attribute'
                        ? 'derived'
                        : kind === 'identifier-attribute'
                          ? 'identifier'
                          : 'simple',
              },
            ],
          };
        }),
      };
    });

    if (position) {
      const currentAttributeCount =
        conceptualModel?.entities.find((entity) => entity.id === entityId)?.attributes.length ?? 0;
      const attributeId = createAttributeId(entityId, `novoAtributo${currentAttributeCount + 1}`);
      setElementPositions((currentPositions) => ({ ...currentPositions, [`${entityId}:${attributeId}`]: position }));
    }

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
    elementPositions,
    setDescription,
    setConceptualModel,
    setLogicalModel,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    clearLogicalModel,
    clearDiagram,
    addEntity,
    addEntityAtPosition,
    removeEntity,
    updateEntityPosition,
    updateElementPosition,
    selectEntity,
    clearEntitySelection,
    updateEntity,
    createRelationship,
    createRelationshipFromConnection,
    addElementAtPosition,
    updateRelationship,
    removeRelationship,
    cycleRelationshipCardinality,
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
  };
}
