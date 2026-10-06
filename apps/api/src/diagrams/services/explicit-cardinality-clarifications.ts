import type { ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import type { ConceptualModel, Relationship } from '../schemas/conceptual-model.schema';

type ExplicitCardinalityConstraint = NonNullable<ClarificationAnswer['cardinality']>;

export type ExplicitCardinalityApplication = {
  model: ConceptualModel;
  unresolved: ExplicitCardinalityConstraint[];
};

/**
 * Aplica a cardinalidade selecionada pelo usuário como uma restrição
 * explícita do domínio, em vez de utilizá-la apenas como informação
 * adicional enviada no prompt.
 */
export function applyExplicitCardinalityClarifications(
  model: ConceptualModel,
  clarifications?: ClarificationAnswer[],
): ExplicitCardinalityApplication {
  const constraints =
    clarifications?.flatMap((clarification) => (clarification.cardinality ? [clarification.cardinality] : [])) ?? [];
  if (constraints.length === 0) return { model, unresolved: [] };

  const entityNames = new Map(model.entities.map((entity) => [entity.id, entity.name]));
  const applied = new Set<number>();
  const relationships = model.relationships.map((relationship) => {
    if (relationship.kind === 'generalization' || relationship.kind === 'specialization') return relationship;

    const matchingConstraints = constraints
      .map((constraint, index) => ({ constraint, index }))
      .filter(({ constraint }) => relationshipMatchesConstraint(relationship, constraint, entityNames));

    if (matchingConstraints.length === 0) return relationship;
    matchingConstraints.forEach(({ index }) => {
      applied.add(index);
    });

    const participants = relationship.participants.map((participant) => {
      const entityName = entityNames.get(participant.entityId) ?? participant.entityId;
      const constraintParticipant = matchingConstraints
        .flatMap(({ constraint }) => constraint.participants)
        .find((candidate) => namesMatch(candidate.entity, entityName));

      return constraintParticipant ? { ...participant, cardinality: constraintParticipant.cardinality } : participant;
    });

    return { ...relationship, participants, type: relationshipType(participants) };
  });

  return {
    model: { ...model, relationships },
    unresolved: constraints.filter((_, index) => !applied.has(index)),
  };
}

function relationshipMatchesConstraint(
  relationship: Relationship,
  constraint: ExplicitCardinalityConstraint,
  entityNames: Map<string, string>,
): boolean {
  return constraint.participants.every((constraintParticipant) =>
    relationship.participants.some((participant) => {
      const entityName = entityNames.get(participant.entityId) ?? participant.entityId;
      return namesMatch(constraintParticipant.entity, entityName);
    }),
  );
}

function relationshipType(participants: Relationship['participants']): Relationship['type'] {
  const values = participants
    .map((participant) => participant.cardinality)
    .sort()
    .join(':');
  return values as Relationship['type'];
}

function namesMatch(first: string, second: string): boolean {
  return canonicalName(first) === canonicalName(second);
}

function canonicalName(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (normalized.endsWith('ns')) return `${normalized.slice(0, -2)}m`;
  return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
}
