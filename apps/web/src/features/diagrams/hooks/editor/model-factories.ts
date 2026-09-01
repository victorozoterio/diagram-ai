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
    relationships: [],
    ambiguities: [],
  };
}

export function createSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export function createManualEntity(kind: EntityKind, entityCount: number): Entity {
  const label = kind === 'weak' ? 'Entidade Fraca' : kind === 'associative' ? 'Entidade Associativa' : 'Nova Entidade';
  const name = `${label} ${entityCount + 1}`;

  return {
    id: createSlug(name),
    name,
    description: 'Entidade adicionada manualmente pelo usuário.',
    kind,
    attributes: [],
  };
}

export function createManualAttribute(
  entityId: string,
  attributeCount: number,
  kind: ElementKind,
): Entity['attributes'][number] {
  const name = `novoAtributo${attributeCount + 1}`;
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
    id: `${entityId}_${createSlug(name)}`,
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

export function createStandaloneRelationship(kind: Relationship['kind']): Relationship {
  return {
    id: `relationship_${Date.now().toString(36)}`,
    name: 'novoRelacionamento',
    type: '1:N',
    kind,
    participants: [],
    attributes: [],
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

export function attributePositionKey(entityId: string, attributeId: string) {
  return `${entityId}:${attributeId}`;
}
