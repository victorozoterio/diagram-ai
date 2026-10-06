import type { ConceptualModel, Entity, Relationship } from '../schemas/conceptual-model.schema';

/**
 * Remove apenas artefatos que duplicam uma associação já presente no DER:
 * entidades sem propriedades próprias e atributos que só repetem participantes.
 */
export function reconcileGeneratedAssociationArtifacts(model: ConceptualModel): ConceptualModel {
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  let removedAttribute = false;
  const relationships = model.relationships.map((relationship) => {
    const attributes = removeParticipantEchoAttributes(relationship, entityById);
    if (attributes === relationship.attributes) return relationship;
    removedAttribute = true;
    return { ...relationship, attributes };
  });
  const syntheticEntityIds = findSyntheticAssociationEntities(model.entities, relationships, entityById);

  if (syntheticEntityIds.size === 0 && !removedAttribute) {
    return model;
  }

  return {
    ...model,
    entities: model.entities.filter((entity) => !syntheticEntityIds.has(entity.id)),
    relationships: relationships.filter((relationship) =>
      relationship.participants.every((participant) => !syntheticEntityIds.has(participant.entityId)),
    ),
  };
}

function findSyntheticAssociationEntities(
  entities: Entity[],
  relationships: Relationship[],
  entityById: Map<string, Entity>,
): Set<string> {
  const syntheticIds = new Set<string>();
  for (const entity of entities) {
    // Uma entidade usada por alguma associação não é removida por inferência.
    if (relationships.some((relationship) => relationship.participants.some(({ entityId }) => entityId === entity.id)))
      continue;

    const representedRelationship = relationships.find((relationship) => {
      if (relationship.kind !== 'relationship' || relationship.participants.length !== 2) return false;
      if (!sameRelationshipConcept(entity.name, relationship.name)) return false;
      const participants = relationship.participants
        .map(({ entityId }) => entityById.get(entityId))
        .filter((participant): participant is Entity => Boolean(participant));
      return participants.length === 2 && hasOnlyParticipantReferences(entity, participants);
    });
    if (representedRelationship) syntheticIds.add(entity.id);
  }
  return syntheticIds;
}

function hasOnlyParticipantReferences(entity: Entity, participants: Entity[]): boolean {
  const descriptiveAttributes = entity.attributes.filter(
    (attribute) => !attribute.identifier && !isTechnicalIdentifier(attribute.name),
  );
  return (
    descriptiveAttributes.length > 0 &&
    descriptiveAttributes.every((attribute) =>
      participants.some((participant) => sameConcept(attribute.name, participant.name)),
    )
  );
}

function removeParticipantEchoAttributes(
  relationship: Relationship,
  entityById: Map<string, Entity>,
): Relationship['attributes'] {
  if (relationship.kind !== 'relationship') return relationship.attributes;
  const participantTerms = relationship.participants
    .map(({ entityId }) => entityById.get(entityId)?.name)
    .filter((name): name is string => Boolean(name))
    .flatMap(words);
  const relationshipTerms = words(relationship.name);

  const attributes = relationship.attributes.filter((attribute) => {
    const attributeTerms = words(attribute.name);
    if (attributeTerms.length === 0) return true;
    const repeatsParticipant = attributeTerms.some((term) =>
      participantTerms.some((participant) => sameTerm(term, participant)),
    );
    return !(
      repeatsParticipant &&
      attributeTerms.every(
        (term) =>
          participantTerms.some((participant) => sameTerm(term, participant)) ||
          relationshipTerms.some((relation) => sameTerm(term, relation)),
      )
    );
  });
  return attributes.length === relationship.attributes.length ? relationship.attributes : attributes;
}

function sameRelationshipConcept(entityName: string, relationshipName: string): boolean {
  return words(entityName).some((entityTerm) =>
    words(relationshipName).some((relationshipTerm) => sameTerm(entityTerm, relationshipTerm)),
  );
}

function sameConcept(first: string, second: string): boolean {
  return words(first).some((left) => words(second).some((right) => sameTerm(left, right)));
}

function isTechnicalIdentifier(name: string): boolean {
  return /^id[_-]/i.test(name);
}

function words(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);
}

function sameTerm(first: string, second: string): boolean {
  const firstStem = stem(first);
  const secondStem = stem(second);
  return (
    firstStem === secondStem ||
    (firstStem.length >= 5 && secondStem.length >= 5 && firstStem.startsWith(secondStem)) ||
    (firstStem.length >= 5 && secondStem.length >= 5 && secondStem.startsWith(firstStem))
  );
}

function stem(value: string): string {
  return value.replace(/(?:acoes|acao|coes|cao|s)$/i, '').replace(/(?:a|e|o)$/i, '');
}
