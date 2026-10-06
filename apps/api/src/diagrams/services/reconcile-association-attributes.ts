import type { ConceptualModel, Relationship } from '../schemas/conceptual-model.schema';

/**
 * Consolida somente uma relação artificial criada para carregar um atributo da
 * mesma associação. Relações distintas entre o mesmo par são preservadas.
 */
export function reconcileAssociationAttributes(model: ConceptualModel): ConceptualModel {
  if (!model.metadata.generatedBy || !model.metadata.sourceText) return model;

  const source = normalize(model.metadata.sourceText);
  const removed = new Set<string>();
  const additions = new Map<string, Relationship['attributes']>();

  for (const relation of model.relationships) {
    if (relation.kind !== 'relationship' || relation.participants.length !== 2 || relation.attributes.length === 0) {
      continue;
    }
    const samePair = model.relationships.filter(
      (other) => other.kind === 'relationship' && sameParticipants(other, relation),
    );
    if (samePair.length !== 2) continue;

    const target = samePair.find((other) => other.id !== relation.id);
    if (!target || !isAttributeOnlyRelation(relation, source)) continue;
    const attributesAlreadyPresent = relation.attributes.every((attribute) =>
      target.attributes.some((candidate) => sameConcept(candidate.name, attribute.name)),
    );
    if (target.attributes.length > 0 && !attributesAlreadyPresent) continue;

    if (!attributesAlreadyPresent) additions.set(target.id, relation.attributes);
    removed.add(relation.id);
  }

  if (removed.size === 0) return model;
  return {
    ...model,
    relationships: model.relationships
      .filter((relationship) => !removed.has(relationship.id))
      .map((relationship) => {
        const attributes = additions.get(relationship.id);
        return attributes ? { ...relationship, attributes: [...relationship.attributes, ...attributes] } : relationship;
      }),
  };
}

function isAttributeOnlyRelation(relation: Relationship, source: string): boolean {
  const name = normalize(relation.name);
  const firstWord = name.split(' ')[0];
  if (!firstWord || firstWord.length < 3 || source.includes(name)) return false;
  return relation.attributes.every((attribute) => normalize(attribute.name).split(' ')[0] === firstWord);
}

function sameParticipants(first: Relationship, second: Relationship): boolean {
  if (first.participants.length !== 2 || second.participants.length !== 2) return false;
  return (
    first.participants
      .map(({ entityId }) => entityId)
      .sort()
      .join('|') ===
    second.participants
      .map(({ entityId }) => entityId)
      .sort()
      .join('|')
  );
}

function sameConcept(first: string, second: string): boolean {
  const canonical = (value: string) => normalize(value).replaceAll(' ', '');
  const left = canonical(first);
  const right = canonical(second);
  return left === right || `${left}s` === right || `${right}s` === left;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
