import type { ConceptualModel } from '../schemas/conceptual-model.schema';

export type MissingExplicitRelationship = {
  participants: [string, string];
  evidence: string;
};

/**
 * Detecta apenas associações binárias que o requisito declara explicitamente.
 * Não cria relações: serve para pedir ao loop de reparo que recupere um fato
 * textual omitido pela IA.
 */
export function findMissingExplicitRelationships(
  model: ConceptualModel,
  description: string,
): MissingExplicitRelationship[] {
  const entities = model.entities.map((entity) => ({ id: entity.id, name: entity.name }));
  const found = new Map<string, MissingExplicitRelationship>();

  for (const sentence of description.split(/[.!?;\n]+/)) {
    for (const clause of relationshipClauses(sentence)) {
      const normalizedClause = normalize(clause);
      if (!hasRelationshipEvidence(normalizedClause)) continue;

      const mentioned = entities.filter((entity) => mentionsEntity(normalizedClause, entity.name));
      if (mentioned.length !== 2) continue;

      const [first, second] = mentioned;
      const alreadyRepresented = model.relationships.some(
        (relationship) =>
          relationship.kind !== 'generalization' &&
          relationship.kind !== 'specialization' &&
          relationship.participants.some((participant) => participant.entityId === first.id) &&
          relationship.participants.some((participant) => participant.entityId === second.id),
      );
      if (alreadyRepresented) continue;

      const key = [first.id, second.id].sort().join(':');
      found.set(key, {
        participants: [first.name, second.name],
        evidence: clause.trim(),
      });
    }
  }

  return [...found.values()];
}

function hasRelationshipEvidence(sentence: string): boolean {
  return /\b(?:pertence\w*|relacion\w*|particip\w*|realiz\w*|solicit\w*|vincul\w*|trabalh\w*|inclu\w*|associ\w*|contem|possui\w*)\b/.test(
    sentence,
  );
}

function relationshipClauses(sentence: string): string[] {
  return sentence.split(/,\s*(?:mas|porem|porém|e)\s+(?=(?:cada|um|uma)\b)/i);
}

function mentionsEntity(sentence: string, entityName: string): boolean {
  const words = normalize(entityName)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.length > 0 && words.every((word) => new RegExp(`\\b${escapeRegExp(word)}(?:s|es)?\\b`).test(sentence));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
