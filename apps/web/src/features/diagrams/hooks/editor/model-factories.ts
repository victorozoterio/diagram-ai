import type { Cardinality, ConceptualModel, ElementKind, Entity, EntityKind, Relationship } from '../../types';

export const DEFAULT_DESCRIPTION =
  'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome, email e telefone. O pedido possui data e valor total.';

export function createEmptyConceptualModel(): ConceptualModel {
  return {
    metadata: {
      title: 'Modelo conceitual',
      description: 'Modelo criado manualmente pelo usuário.',
      generatedBy: 'user',
      generatedAt: new Date().toISOString(),
    },
    entities: [],
    standaloneAttributes: [],
    relationships: [],
    ambiguities: [],
  };
}

/**
 * Cria uma identidade estável para elementos adicionados manualmente.
 */
export function createManualElementId(prefix: string, existingIds: Iterable<string> = []) {
  const usedIds = new Set(existingIds);
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const baseId = `${prefix}_${randomId}`;
  let id = baseId;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return id;
}

export function conceptualElementIds(model: ConceptualModel): Set<string> {
  return new Set([
    ...model.entities.map((entity) => entity.id),
    ...model.relationships.map((relationship) => relationship.id),
    ...(model.standaloneAttributes ?? []).flatMap(attributeIds),
    ...model.entities.flatMap((entity) => entity.attributes.flatMap(attributeIds)),
    ...model.relationships.flatMap((relationship) => relationship.attributes.flatMap(attributeIds)),
  ]);
}

export function createManualEntity(kind: EntityKind, entities: Entity[]): Entity {
  const label = kind === 'weak' ? 'Entidade Fraca' : kind === 'associative' ? 'Entidade Associativa' : 'Entidade';
  const existingAutomaticNumbers = new Set(
    entities
      .filter((entity) => (entity.kind ?? 'regular') === kind)
      .map((entity) => entity.name.match(new RegExp(`^${label} (\\d+)$`))?.[1])
      .filter((number): number is string => Boolean(number))
      .map(Number),
  );
  let nextNumber = 1;
  while (existingAutomaticNumbers.has(nextNumber)) {
    nextNumber += 1;
  }
  const name = `${label} ${nextNumber}`;

  return {
    id: createManualElementId(
      'entity',
      entities.map((entity) => entity.id),
    ),
    name,
    description: 'Entidade adicionada manualmente pelo usuário.',
    kind,
    attributes: [],
  };
}

export function createManualAttribute(
  attributeCount: number,
  kind: ElementKind,
  existingIds: Iterable<string> = [],
): Entity['attributes'][number] {
  const name = `Atributo${attributeCount + 1}`;
  const attributeKind =
    kind === 'multivalued-attribute'
      ? 'multivalued'
      : kind === 'composite-attribute'
        ? 'composite'
        : kind === 'derived-attribute'
          ? 'derived'
          : kind === 'identifier-attribute'
            ? 'identifier'
            : 'simple';

  return {
    id: createManualElementId('attribute', existingIds),
    name,
    type: 'string',
    description: 'Atributo adicionado manualmente pelo usuário.',
    identifier: kind === 'identifier-attribute',
    required: false,
    unique: false,
    multivalued: kind === 'multivalued-attribute',
    composite: kind === 'composite-attribute',
    derived: kind === 'derived-attribute',
    components: [],
    kind: attributeKind,
  };
}

export function createStandaloneRelationship(
  kind: Relationship['kind'],
  existingIds: Iterable<string> = [],
): Relationship {
  const isGeneralization = kind === 'generalization' || kind === 'specialization';

  return {
    id: createManualElementId('relationship', existingIds),
    name: isGeneralization ? 'Gen' : 'Rel',
    type: '1:N',
    kind,
    participants: [],
    attributes: [],
    ...(isGeneralization ? { subtypeIds: [], subtypeHandles: {} } : {}),
  };
}

export function resolveRelationshipCardinality(participants: Relationship['participants']): Cardinality {
  const [first, second] = participants;

  if (!second || (first.cardinality === '1' && second.cardinality === '1')) {
    return '1:1';
  }

  return first.cardinality === 'N' && second.cardinality === 'N' ? 'N:N' : '1:N';
}

export function relationshipPositionKey(relationshipId: string) {
  return `relationship:${relationshipId}`;
}

export function attributePositionKey(entityId: string | null, attributeId: string) {
  return `${entityId ?? 'standalone'}:${attributeId}`;
}

function attributeIds(attribute: Entity['attributes'][number]) {
  return [attribute.id, ...attribute.components.map((component) => component.id)];
}
