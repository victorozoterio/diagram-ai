import type { ConceptualModel } from '../schemas/conceptual-model.schema';

/** Diferencia um dado da ocorrência da associação de um dado homônimo de uma entidade. */
export function contextualizeRelationshipAttributes(model: ConceptualModel): ConceptualModel {
  const sourceText = model.metadata.sourceText;
  if (!model.metadata.generatedBy || !sourceText) return model;

  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const sentences = sourceText.split(/[.!?;\n]+/);
  return {
    ...model,
    relationships: model.relationships.map((relationship) => {
      if (relationship.kind !== 'relationship') return relationship;
      const entities = relationship.participants
        .map(({ entityId }) => entityById.get(entityId))
        .filter((entity): entity is ConceptualModel['entities'][number] => Boolean(entity));
      if (entities.length < 2) return relationship;

      const attributes = relationship.attributes.map((attribute) => {
        const duplicateInEntity = entities.some((entity) =>
          entity.attributes.some((candidate) => normalize(candidate.name) === normalize(attribute.name)),
        );
        if (!duplicateInEntity) return attribute;

        const attributeRoot = normalize(attribute.name).split('_')[0];
        const sentence = sentences.find((candidate) => {
          const normalized = normalize(candidate);
          return (
            /\b(?:para|por|em)_cada_/.test(normalized) &&
            entities.every((entity) => mentions(normalized, entity.name)) &&
            normalized.split('_').includes(attributeRoot)
          );
        });
        const association = sentence?.match(/\b(?:para|por|em)\s+cada\s+([\p{L}]+)/iu)?.[1];
        if (!association) return attribute;

        const suffix = normalize(association);
        if (normalize(attribute.name).split('_').includes(suffix)) return attribute;
        const contextualName = `${attribute.name}_${suffix}`;
        if (relationship.attributes.some((candidate) => normalize(candidate.name) === normalize(contextualName))) {
          return attribute;
        }
        return { ...attribute, name: contextualName };
      });
      return { ...relationship, attributes };
    }),
  };
}

function mentions(sentence: string, entity: string): boolean {
  const name = normalize(entity);
  const stem = name.endsWith('m') ? name.slice(0, -1) : name.endsWith('s') ? name.slice(0, -1) : name;
  return sentence
    .split('_')
    .some((word) => word === name || word === stem || (word.startsWith(stem) && word.length <= stem.length + 3));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
