import type { Attribute, ConceptualModel } from '../schemas/conceptual-model.schema';

export type CompositeAttributeInconsistency = {
  scope: 'entity' | 'relationship' | 'standalone';
  owner: string;
  attribute: Pick<Attribute, 'id' | 'name' | 'type' | 'composite' | 'components' | 'multivalued'>;
};

/**
 * Detecta flags de composição que não correspondem aos componentes realmente
 * gerados. Não usa nomes do atributo para inferir semântica.
 */
export function findCompositeAttributeInconsistencies(model: ConceptualModel): CompositeAttributeInconsistency[] {
  const inconsistencies: CompositeAttributeInconsistency[] = [];
  const inspect = (scope: CompositeAttributeInconsistency['scope'], owner: string, attribute: Attribute) => {
    if (attribute.composite === attribute.components.length > 0) return;
    inconsistencies.push({
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
    });
  };

  model.entities.forEach((entity) => {
    entity.attributes.forEach((attribute) => {
      inspect('entity', entity.name, attribute);
    });
  });
  model.relationships.forEach((relationship) => {
    relationship.attributes.forEach((attribute) => {
      inspect('relationship', relationship.name, attribute);
    });
  });
  model.standaloneAttributes.forEach((attribute) => {
    inspect('standalone', 'modelo', attribute);
  });

  return inconsistencies;
}

/**
 * Canonicaliza somente a flag derivável da estrutura já presente: componentes
 * não vazios tornam o atributo composto; sem componentes, ele é simples.
 * Nenhum componente é inventado e nenhum nome é interpretado.
 */
export function normalizeCompositeAttributes(model: ConceptualModel): ConceptualModel {
  const normalize = (attribute: Attribute): Attribute => {
    const composite = attribute.components.length > 0;
    return attribute.composite === composite ? attribute : { ...attribute, composite };
  };

  return {
    ...model,
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: entity.attributes.map(normalize),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: relationship.attributes.map(normalize),
    })),
    standaloneAttributes: model.standaloneAttributes.map(normalize),
  };
}
