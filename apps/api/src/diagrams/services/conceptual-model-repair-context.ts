import type { z } from 'zod';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';

export type DuplicateRelationshipAttributeConflict = {
  relationship: string;
  relationshipAttribute: string;
  participantAttributes: Array<{
    entity: string;
    attribute: string;
  }>;
  rule: string;
};

export type ConceptualModelRepairContext = {
  duplicateRelationshipAttributes: DuplicateRelationshipAttributeConflict[];
};

/** Produz detalhes acionáveis para que a chamada de reparo corrija o modelo anterior. */
export function buildConceptualModelRepairContext(
  model: ConceptualModel,
  error: z.ZodError,
): ConceptualModelRepairContext {
  const duplicateRelationshipAttributes: DuplicateRelationshipAttributeConflict[] = [];

  for (const issue of error.issues) {
    if (issue.message !== 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.') {
      continue;
    }

    const [relationshipsKey, relationshipIndex, attributesKey, attributeIndex] = issue.path;
    if (
      relationshipsKey !== 'relationships' ||
      typeof relationshipIndex !== 'number' ||
      attributesKey !== 'attributes' ||
      typeof attributeIndex !== 'number'
    ) {
      continue;
    }

    const relationship = model.relationships[relationshipIndex];
    const relationshipAttribute = relationship?.attributes[attributeIndex];
    if (!relationship || !relationshipAttribute) continue;

    const attributeName = normalizeName(relationshipAttribute.name);
    const participantAttributes = relationship.participants.flatMap((participant) => {
      const entity = model.entities.find((candidate) => candidate.id === participant.entityId);
      if (!entity) return [];

      return entity.attributes
        .filter((attribute) => normalizeName(attribute.name) === attributeName)
        .map((attribute) => ({ entity: entity.name, attribute: attribute.name }));
    });

    duplicateRelationshipAttributes.push({
      relationship: relationship.name,
      relationshipAttribute: relationshipAttribute.name,
      participantAttributes,
      rule: issue.message,
    });
  }

  return { duplicateRelationshipAttributes };
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
