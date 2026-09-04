import type { Attribute, ConceptualModel, Entity, Relationship } from '../../types';

export function updateEntityInModel(
  model: ConceptualModel,
  entityId: string,
  changes: Partial<Pick<Entity, 'name' | 'description'>>,
): ConceptualModel {
  return {
    ...model,
    entities: model.entities.map((entity) => (entity.id === entityId ? { ...entity, ...changes } : entity)),
  };
}

export function removeEntityFromModel(model: ConceptualModel, entityId: string): ConceptualModel {
  return {
    ...model,
    entities: model.entities.filter((entity) => entity.id !== entityId),
    relationships: model.relationships.filter((relationship) =>
      relationship.participants.every((participant) => participant.entityId !== entityId),
    ),
  };
}

export function addAttributeToModel(
  model: ConceptualModel,
  entityId: string,
  attribute: Entity['attributes'][number],
): ConceptualModel {
  return {
    ...model,
    entities: model.entities.map((entity) =>
      entity.id === entityId ? { ...entity, attributes: [...entity.attributes, attribute] } : entity,
    ),
  };
}

export function addStandaloneAttributeToModel(model: ConceptualModel, attribute: Attribute): ConceptualModel {
  return { ...model, standaloneAttributes: [...(model.standaloneAttributes ?? []), attribute] };
}

export function updateAttributeInModel(
  model: ConceptualModel,
  entityId: string | null,
  attributeId: string,
  changes: Partial<Attribute>,
): ConceptualModel {
  return {
    ...model,
    standaloneAttributes: (model.standaloneAttributes ?? []).map((attribute) =>
      entityId === null && attribute.id === attributeId ? { ...attribute, ...changes } : attribute,
    ),
    entities: model.entities.map((entity) =>
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
}

export function removeAttributeFromModel(
  model: ConceptualModel,
  entityId: string | null,
  attributeId: string,
): ConceptualModel {
  return {
    ...model,
    standaloneAttributes: (model.standaloneAttributes ?? []).filter(
      (attribute) => entityId !== null || attribute.id !== attributeId,
    ),
    entities: model.entities.map((entity) =>
      entity.id !== entityId
        ? entity
        : { ...entity, attributes: entity.attributes.filter((attribute) => attribute.id !== attributeId) },
    ),
  };
}

export function updateRelationshipInModel(
  model: ConceptualModel,
  relationshipId: string,
  changes: Partial<Pick<Relationship, 'name'>>,
): ConceptualModel {
  return {
    ...model,
    relationships: model.relationships.map((relationship) =>
      relationship.id === relationshipId ? { ...relationship, ...changes } : relationship,
    ),
  };
}

export function removeRelationshipFromModel(model: ConceptualModel, relationshipId: string): ConceptualModel {
  return {
    ...model,
    relationships: model.relationships.filter((relationship) => relationship.id !== relationshipId),
  };
}
