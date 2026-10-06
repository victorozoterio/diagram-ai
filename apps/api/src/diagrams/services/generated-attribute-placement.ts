import type { ConceptualModel } from '../schemas/conceptual-model.schema';

export type MisplacedGeneratedAttribute = {
  entityId: string;
  entity: string;
  attributeId: string;
  attribute: string;
  relationshipId: string;
  relationship: string;
  participants: string[];
  reason: 'entity-used-as-attribute' | 'association-attribute-in-entity';
  evidence: string;
};

/** Identifica atribuições contraditórias com as entidades e associações explícitas do texto. */
export function misplacedGeneratedAttributes(model: ConceptualModel): MisplacedGeneratedAttribute[] {
  const sourceText = model.metadata.sourceText;
  if (!model.metadata.generatedBy || !sourceText) return [];

  const sentences = sourceText
    .split(/[.!?;\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const issues: MisplacedGeneratedAttribute[] = [];

  for (const entity of model.entities) {
    for (const attribute of entity.attributes) {
      if (attribute.identifier) continue;

      const otherEntity = model.entities.find(
        (candidate) => candidate.id !== entity.id && sameConcept(candidate.name, attribute.name),
      );
      if (otherEntity) {
        const relationship = model.relationships.find(
          (candidate) =>
            candidate.kind !== 'generalization' &&
            candidate.kind !== 'specialization' &&
            candidate.participants.some(({ entityId }) => entityId === entity.id) &&
            candidate.participants.some(({ entityId }) => entityId === otherEntity.id),
        );
        if (relationship) {
          issues.push({
            entityId: entity.id,
            entity: entity.name,
            attributeId: attribute.id,
            attribute: attribute.name,
            relationshipId: relationship.id,
            relationship: relationship.name,
            participants: [entity.name, otherEntity.name],
            reason: 'entity-used-as-attribute',
            evidence: `${otherEntity.name} já é entidade participante de ${relationship.name}.`,
          });
          continue;
        }
      }

      // O texto precisa atribuir o dado à ocorrência de uma associação entre
      // duas entidades. Um único termo genérico coincidente não é suficiente.
      const attributeWords = words(attribute.name).filter((word) => word.length > 2);
      if (attributeWords.length < 2) continue;

      for (const relationship of model.relationships) {
        if (relationship.kind === 'generalization' || relationship.kind === 'specialization') continue;
        if (!relationship.participants.some(({ entityId }) => entityId === entity.id)) continue;
        const participants = relationship.participants
          .map(({ entityId }) => entityById.get(entityId)?.name)
          .filter((name): name is string => Boolean(name));
        if (participants.length < 2) continue;

        const otherParticipants = participants.filter((participant) => !sameConcept(participant, entity.name));
        const isExplicitEntityAttribute = sentences.some((sentence) => {
          const normalized = normalize(sentence);
          return (
            !/\b(?:para|por|em)\s+cada\b/.test(normalized) &&
            mentions(normalized, entity.name) &&
            otherParticipants.every((participant) => !mentions(normalized, participant)) &&
            attributeWords.every((word) => mentions(normalized, word))
          );
        });
        if (isExplicitEntityAttribute) continue;

        const evidence = sentences.find((sentence) => {
          const normalized = normalize(sentence);
          return (
            /\b(?:para|por|em)\s+cada\b/.test(normalized) &&
            participants.every((participant) => mentions(normalized, participant)) &&
            attributeWords.filter((word) => mentions(normalized, word)).length >= 2
          );
        });
        if (!evidence) continue;

        issues.push({
          entityId: entity.id,
          entity: entity.name,
          attributeId: attribute.id,
          attribute: attribute.name,
          relationshipId: relationship.id,
          relationship: relationship.name,
          participants,
          reason: 'association-attribute-in-entity',
          evidence,
        });
        break;
      }
    }
  }

  return issues;
}

/**
 * Corrige apenas os casos em que o destino já é inequívoco: outra entidade
 * participante ou a única associação indicada pela frase de ocorrência.
 * Se o relacionamento já possuir outro atributo, deixa a decisão para o repair.
 */
export function reconcileGeneratedAttributePlacement(model: ConceptualModel): ConceptualModel {
  const issues = misplacedGeneratedAttributes(model);
  if (issues.length === 0) return model;

  const removedByEntity = new Map<string, Set<string>>();
  const transferredByRelationship = new Map<string, ConceptualModel['entities'][number]['attributes']>();

  for (const issue of issues) {
    const entity = model.entities.find((candidate) => candidate.id === issue.entityId);
    const attribute = entity?.attributes.find((candidate) => candidate.id === issue.attributeId);
    const relationship = model.relationships.find((candidate) => candidate.id === issue.relationshipId);
    if (!entity || !attribute || !relationship) continue;

    if (issue.reason === 'association-attribute-in-entity') {
      const possibleDestinations = issues.filter(
        (candidate) =>
          candidate.reason === issue.reason &&
          candidate.entityId === issue.entityId &&
          candidate.attributeId === issue.attributeId,
      );
      if (possibleDestinations.length !== 1) continue;
      const alreadyPresent = relationship.attributes.some((candidate) => sameConcept(candidate.name, attribute.name));
      if (!alreadyPresent && relationship.attributes.length > 0) continue;
      if (!alreadyPresent) {
        const transfers = transferredByRelationship.get(relationship.id) ?? [];
        transfers.push(attribute);
        transferredByRelationship.set(relationship.id, transfers);
      }
    }

    const removed = removedByEntity.get(entity.id) ?? new Set<string>();
    removed.add(attribute.id);
    removedByEntity.set(entity.id, removed);
  }

  if (removedByEntity.size === 0) return model;
  return {
    ...model,
    entities: model.entities.map((entity) => {
      const removed = removedByEntity.get(entity.id);
      return removed
        ? { ...entity, attributes: entity.attributes.filter((attribute) => !removed.has(attribute.id)) }
        : entity;
    }),
    relationships: model.relationships.map((relationship) => {
      const transferred = transferredByRelationship.get(relationship.id);
      return transferred ? { ...relationship, attributes: [...relationship.attributes, ...transferred] } : relationship;
    }),
  };
}

function sameConcept(first: string, second: string): boolean {
  const canonical = (value: string) => normalize(value).replace(/[^a-z0-9]/g, '');
  const left = canonical(first);
  const right = canonical(second);
  return left === right || `${left}s` === right || `${right}s` === left;
}

function mentions(text: string, concept: string): boolean {
  const normalized = normalize(concept)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const plural = normalized.endsWith('m') ? `${escaped.slice(0, -1)}ns` : `${escaped}(?:s|es)?`;
  return new RegExp(`\\b(?:${escaped}|${plural})\\b`).test(text);
}

function words(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
