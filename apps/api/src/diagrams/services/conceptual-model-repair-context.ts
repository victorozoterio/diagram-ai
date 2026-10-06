import type { z } from 'zod';

import {
  type Attribute,
  COMPOSITE_ATTRIBUTE_INVARIANT_MESSAGE,
  type ConceptualModel,
} from '../schemas/conceptual-model.schema';

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
  compositeAttributes: CompositeAttributeConflict[];
};

export type CompositeAttributeConflict = {
  scope: 'entity' | 'relationship' | 'standalone';
  owner: string;
  attribute: Pick<Attribute, 'id' | 'name' | 'type' | 'composite' | 'components' | 'multivalued'>;
  rule: string;
};

/** Produz detalhes acionáveis para que a chamada de reparo corrija o modelo anterior. */
export function buildConceptualModelRepairContext(
  model: ConceptualModel,
  error: z.ZodError,
): ConceptualModelRepairContext {
  const duplicateRelationshipAttributes: DuplicateRelationshipAttributeConflict[] = [];
  const compositeAttributes: CompositeAttributeConflict[] = [];

  for (const issue of error.issues) {
    if (issue.message === COMPOSITE_ATTRIBUTE_INVARIANT_MESSAGE) {
      const conflict = compositeAttributeAtPath(model, issue.path);
      if (conflict) compositeAttributes.push({ ...conflict, rule: issue.message });
      continue;
    }

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

  return { duplicateRelationshipAttributes, compositeAttributes };
}

function compositeAttributeAtPath(
  model: ConceptualModel,
  path: PropertyKey[],
): Omit<CompositeAttributeConflict, 'rule'> | undefined {
  const [root, ownerIndex, attributesKey, attributeIndex] = path;
  if (attributesKey === 'attributes' && typeof ownerIndex === 'number' && typeof attributeIndex === 'number') {
    if (root === 'entities') {
      const entity = model.entities[ownerIndex];
      const attribute = entity?.attributes[attributeIndex];
      return attribute ? compositeConflict('entity', entity.name, attribute) : undefined;
    }

    if (root === 'relationships') {
      const relationship = model.relationships[ownerIndex];
      const attribute = relationship?.attributes[attributeIndex];
      return attribute ? compositeConflict('relationship', relationship.name, attribute) : undefined;
    }
  }

  if (root === 'standaloneAttributes' && typeof ownerIndex === 'number') {
    const attribute = model.standaloneAttributes[ownerIndex];
    return attribute ? compositeConflict('standalone', 'modelo', attribute) : undefined;
  }

  return undefined;
}

function compositeConflict(
  scope: CompositeAttributeConflict['scope'],
  owner: string,
  attribute: Attribute,
): Omit<CompositeAttributeConflict, 'rule'> {
  return {
    scope,
    owner,
    attribute: {
      id: attribute.id,
      name: attribute.name,
      type: attribute.type,
      composite: attribute.composite,
      components: attribute.components,
      multivalued: attribute.multivalued,
    },
  };
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
