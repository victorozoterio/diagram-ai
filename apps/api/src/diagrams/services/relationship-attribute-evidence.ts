import type { ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import type { ConceptualModel } from '../schemas/conceptual-model.schema';

export type UnsupportedRelationshipAttribute = {
  relationship: string;
  attribute: string;
  participants: string[];
  rule: string;
};

/**
 * Verifica atributos de relacionamentos gerados pela IA que não possuem
 * evidências correspondentes na descrição fornecida pelo usuário.
 */
export function unsupportedRelationshipAttributes(
  model: ConceptualModel,
  clarifications?: ClarificationAnswer[],
): UnsupportedRelationshipAttribute[] {
  const sourceText = model.metadata.sourceText;
  if (!sourceText || !model.metadata.generatedBy) return [];

  const explicitText = [sourceText, ...(clarifications?.flatMap((clarification) => clarification.answers) ?? [])].join(
    '\n',
  );
  const sentences = explicitText.split(/[.!?;\n]+/).map(normalize);
  const entityNames = new Map(model.entities.map((entity) => [entity.id, entity.name]));

  return model.relationships.flatMap((relationship) => {
    if (relationship.kind === 'generalization' || relationship.kind === 'specialization') return [];

    const participants = relationship.participants
      .map((participant) => entityNames.get(participant.entityId))
      .filter((name): name is string => Boolean(name));
    if (participants.length < 2) return [];

    return relationship.attributes.flatMap((attribute) => {
      const attributeWords = normalize(attribute.name)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2);
      const relationshipName = normalize(relationship.name).replaceAll('_', ' ');
      const hasEvidence = sentences.some((sentence, index) => {
        const namesTheAssociation = participants.every((participant) => mentions(sentence, participant));
        const namesTheRelationship = relationshipName.length > 2 && sentence.includes(relationshipName);
        const namesAnotherEntity = model.entities.some(
          (entity) => !participants.includes(entity.name) && mentions(sentence, entity.name),
        );
        const referencesPreviousAssociation =
          index > 0 &&
          !namesAnotherEntity &&
          /\b(?:para|por|em) cada\b|\b(?:dessa|deste|dessa mesma) (?:relacao|associacao|ocorrencia)\b/.test(sentence) &&
          participants.every((participant) => mentions(sentences[index - 1], participant));
        return (
          (namesTheAssociation || namesTheRelationship || referencesPreviousAssociation) &&
          attributeWords.some((word) => mentions(sentence, word))
        );
      });

      return hasEvidence
        ? []
        : [
            {
              relationship: relationship.name,
              attribute: attribute.name,
              participants,
              rule: 'Atributos de relacionamento gerados pela IA precisam estar vinculados a essa associação na descrição.',
            },
          ];
    });
  });
}

function mentions(sentence: string, concept: string): boolean {
  const words = normalize(concept)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.every((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const plural = word.endsWith('m') ? `${escaped.slice(0, -1)}ns` : `${escaped}(?:s|es)?`;
    return new RegExp(`\\b(?:${escaped}|${plural})\\b`).test(sentence);
  });
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
