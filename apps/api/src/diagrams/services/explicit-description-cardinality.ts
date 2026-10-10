import type { ConceptualModel, Relationship } from '../schemas/conceptual-model.schema';

type Cardinality = '1' | 'N';

type ParticipantConstraint = {
  entityId: string;
  cardinality: Cardinality;
};

/**
 * Reaplica somente cardinalidades que o texto determina nos dois sentidos.
 * Isso impede que um reparo da IA troque uma relação explícita por 1:1 sem
 * inferir cardinalidades para associações ainda ambíguas.
 */
export function applyExplicitDescriptionCardinality(model: ConceptualModel, description: string): ConceptualModel {
  const entities = new Map(model.entities.map((entity) => [entity.id, entity.name]));
  let changed = false;
  const relationships = model.relationships.map((relationship) => {
    if (relationship.kind === 'generalization' || relationship.kind === 'specialization') return relationship;

    const constraint = relationshipConstraint(relationship, entities, description);
    if (!constraint) return relationship;

    const participants = relationship.participants.map((participant) => {
      const confirmed = constraint.find((candidate) => candidate.entityId === participant.entityId);
      return confirmed ? { ...participant, cardinality: confirmed.cardinality } : participant;
    });

    if (
      participants.every(
        (participant, index) => participant.cardinality === relationship.participants[index]?.cardinality,
      )
    ) {
      return relationship;
    }
    changed = true;
    return { ...relationship, participants, type: relationshipType(participants) };
  });

  return changed ? { ...model, relationships } : model;
}

function relationshipConstraint(
  relationship: Relationship,
  entities: Map<string, string>,
  description: string,
): ParticipantConstraint[] | undefined {
  if (relationship.participants.length !== 2) return undefined;
  const [first, second] = relationship.participants;
  const firstName = entities.get(first.entityId);
  const secondName = entities.get(second.entityId);
  if (!firstName || !secondName) return undefined;

  const values = new Map<string, Set<Cardinality>>([
    [first.entityId, new Set<Cardinality>()],
    [second.entityId, new Set<Cardinality>()],
  ]);
  let directionalClauses = 0;

  for (const sentence of description.split(/[.!?;\n]+/)) {
    for (const clause of relationshipClauses(sentence)) {
      const normalizedClause = normalize(clause);
      if (!hasRelationshipEvidence(normalizedClause)) continue;
      if (!mentionsEntity(normalizedClause, firstName) || !mentionsEntity(normalizedClause, secondName)) continue;

      const firstHasEvidence = addEvidence(values.get(first.entityId), normalizedClause, firstName);
      const secondHasEvidence = addEvidence(values.get(second.entityId), normalizedClause, secondName);
      if (firstHasEvidence || secondHasEvidence) directionalClauses += 1;
    }
  }

  // Uma única direção como “A pode ter vários B” continua ambígua para o outro lado.
  if (directionalClauses < 2) return undefined;

  const firstCardinality = resolveCardinality(values.get(first.entityId));
  const secondCardinality = resolveCardinality(values.get(second.entityId));
  if (!firstCardinality || !secondCardinality) return undefined;

  return [
    { entityId: first.entityId, cardinality: firstCardinality },
    { entityId: second.entityId, cardinality: secondCardinality },
  ];
}

function addEvidence(values: Set<Cardinality> | undefined, sentence: string, entityName: string): boolean {
  if (!values) return false;
  const entity = entityPattern(entityName);
  let found = false;
  if (new RegExp(`\\b(?:varios|varias|muitos|muitas|diversos|diversas)\\s+${entity}\\b`).test(sentence)) {
    values.add('N');
    found = true;
  }
  if (
    new RegExp(`\\b(?:um|uma|apenas\\s+um|apenas\\s+uma|somente\\s+um|somente\\s+uma)\\s+${entity}\\b`).test(sentence)
  ) {
    values.add('1');
    found = true;
  }
  return found;
}

function resolveCardinality(values: Set<Cardinality> | undefined): Cardinality | undefined {
  if (!values?.size) return undefined;
  return values.has('N') ? 'N' : '1';
}

function relationshipType(participants: Relationship['participants']): Relationship['type'] {
  return participants
    .map((participant) => participant.cardinality)
    .sort()
    .join(':') as Relationship['type'];
}

function relationshipClauses(sentence: string): string[] {
  return sentence.split(/,\s*(?:mas|porem|porém|e)\s+(?=(?:cada|um|uma)\b)/i);
}

function hasRelationshipEvidence(sentence: string): boolean {
  return /\b(?:pertence\w*|relacion\w*|particip\w*|realiz\w*|solicit\w*|vincul\w*|trabalh\w*|inclu\w*|associ\w*|contem|possui\w*)\b/.test(
    sentence,
  );
}

function mentionsEntity(sentence: string, entityName: string): boolean {
  const words = normalize(entityName)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.length > 0 && words.every((word) => new RegExp(`\\b${pluralPattern(word)}\\b`).test(sentence));
}

function entityPattern(entityName: string): string {
  return normalize(entityName)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(pluralPattern)
    .join('\\s+');
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

function pluralPattern(word: string): string {
  const singular = escapeRegExp(word);
  const transformedPlural = word.endsWith('m') ? `|${escapeRegExp(`${word.slice(0, -1)}ns`)}` : '';
  return `(?:${singular}(?:s|es)?${transformedPlural})`;
}
