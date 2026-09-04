import { ZodError } from 'zod';
import type { Attribute, Cardinality, ConceptualModel } from '../../../diagrams/schemas/conceptual-model.schema';
import { ConceptualModelStructureSchema } from '../../../diagrams/schemas/conceptual-model.schema';
import {
  type GeneratedAttribute,
  type GeneratedConceptualModel,
  GeneratedConceptualModelSchema,
  type GeneratedRelationship,
} from './conceptual-model-generation.schema';
import { OllamaError } from './ollama.errors';

/** Converte a resposta compacta da IA no modelo completo usado pelo domínio. */
export function parseConceptualModelResponse(content: string): ConceptualModel {
  const cleanedContent = content.replaceAll('```json', '').replaceAll('```', '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch (error) {
    throw new OllamaError('invalid_response', 'A resposta da IA não é um JSON válido.', { cause: error });
  }

  try {
    const generatedModel = GeneratedConceptualModelSchema.parse(parsed);
    const generatedEntities = includeRelationshipParticipants(generatedModel.e, generatedModel.r);
    const entityIds = createEntityIdRegistry(generatedEntities.map((entity) => entity.n));

    return {
      metadata: {},
      entities: generatedEntities.map((entity) => {
        const entityId = entityIds.get(normalizeName(entity.n)) ?? toIdentifier(entity.n);
        return {
          id: entityId,
          name: entity.n,
          attributes: withTechnicalIdentifier(entityId, mapAttributes(entity.a ?? [])),
        };
      }),
      standaloneAttributes: [],
      relationships: generatedModel.r.map((relationship, index) => ({
        id: uniqueRelationshipId(relationship, index),
        name: relationship.n,
        type: relationshipType(relationship),
        participants: relationship.p.map((participant) => ({
          entityId: entityIds.get(normalizeName(participant.e)) ?? toIdentifier(participant.e),
          cardinality: participant.c,
        })),
        attributes: mapAttributes(relationship.a ?? []),
      })),
      ambiguities: (generatedModel.q ?? []).map((message, index) => ({
        id: `ambiguidade_${index + 1}`,
        message,
        suggestions: [],
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new OllamaError('invalid_response', 'O JSON retornado não segue a estrutura de geração.', {
        cause: error,
      });
    }
    throw error;
  }
}

function includeRelationshipParticipants(
  entities: GeneratedConceptualModel['e'],
  relationships: GeneratedConceptualModel['r'],
): GeneratedConceptualModel['e'] {
  const completedEntities = [...entities];
  const knownNames = new Set(entities.map((entity) => normalizeName(entity.n)));

  for (const participant of relationships.flatMap((relationship) => relationship.p)) {
    const normalizedName = normalizeName(participant.e);
    if (!knownNames.has(normalizedName)) {
      completedEntities.push({ n: participant.e });
      knownNames.add(normalizedName);
    }
  }

  return completedEntities;
}

/** Reduz o modelo inválido antes de uma eventual chamada de reparo. */
export function compactConceptualModelForRepair(model: unknown): unknown {
  const parsed = ConceptualModelStructureSchema.safeParse(model);
  if (!parsed.success) return model;

  const entityNames = new Map(parsed.data.entities.map((entity) => [entity.id, entity.name]));

  return {
    e: parsed.data.entities.map((entity) => ({
      n: entity.name,
      a: entity.attributes
        .filter((attribute) => attribute.name !== `id_${toIdentifier(entity.name)}`)
        .map(compactAttribute),
    })),
    r: parsed.data.relationships.map((relationship) => ({
      n: relationship.name,
      p: relationship.participants.map((participant) => ({
        e: entityNames.get(participant.entityId) ?? participant.entityId,
        c: participant.cardinality,
      })),
      ...(relationship.attributes.length > 0 ? { a: relationship.attributes.map(compactAttribute) } : {}),
    })),
    ...(parsed.data.ambiguities.length > 0 ? { q: parsed.data.ambiguities.map((ambiguity) => ambiguity.message) } : {}),
  };
}

function mapAttributes(attributes: GeneratedAttribute[]): Attribute[] {
  const usedIds = new Set<string>();
  return attributes.map((attribute) => mapAttribute(attribute, usedIds));
}

function mapAttribute(attribute: GeneratedAttribute, usedIds: Set<string>): Attribute {
  const flags = new Set(attribute.f ?? []);
  const id = uniqueId(toIdentifier(attribute.n), usedIds);

  return {
    id,
    name: attribute.n,
    type: expandAttributeType(attribute.t),
    identifier: flags.has('i'),
    required: flags.has('r'),
    unique: flags.has('u'),
    multivalued: flags.has('m'),
    composite: flags.has('c'),
    derived: flags.has('d'),
    components: (attribute.c ?? []).map((component, index) => ({
      id: `${id}_${toIdentifier(component.n) || index + 1}`,
      name: component.n,
      type: expandAttributeType(component.t),
    })),
  };
}

function withTechnicalIdentifier(entityId: string, attributes: Attribute[]): Attribute[] {
  const technicalName = `id_${entityId}`;
  const existingIdentifier = attributes.find((attribute) => attribute.name === technicalName);

  if (existingIdentifier) {
    existingIdentifier.type = 'uuid';
    existingIdentifier.identifier = true;
    existingIdentifier.required = true;
    existingIdentifier.unique = true;
    return attributes;
  }

  return [
    {
      id: technicalName,
      name: technicalName,
      type: 'uuid',
      identifier: true,
      required: true,
      unique: true,
      multivalued: false,
      composite: false,
      derived: false,
      components: [],
    },
    ...attributes,
  ];
}

function compactAttribute(attribute: Attribute): GeneratedAttribute {
  const flags: NonNullable<GeneratedAttribute['f']> = [];
  if (attribute.identifier) flags.push('i');
  if (attribute.required) flags.push('r');
  if (attribute.unique) flags.push('u');
  if (attribute.multivalued) flags.push('m');
  if (attribute.composite) flags.push('c');
  if (attribute.derived) flags.push('d');

  return {
    n: attribute.name,
    t: compactAttributeType(attribute.type),
    ...(flags.length > 0 ? { f: flags } : {}),
    ...(attribute.components.length > 0
      ? { c: attribute.components.map(({ name, type }) => ({ n: name, t: compactAttributeType(type) })) }
      : {}),
  };
}

function createEntityIdRegistry(entityNames: string[]): Map<string, string> {
  const registry = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const entityName of entityNames) {
    const normalizedName = normalizeName(entityName);
    if (!registry.has(normalizedName)) {
      registry.set(normalizedName, uniqueId(toIdentifier(entityName), usedIds));
    }
  }

  return registry;
}

function relationshipType(relationship: GeneratedRelationship): Cardinality {
  return relationship.p
    .map((participant) => participant.c)
    .sort()
    .join(':') as Cardinality;
}

function uniqueRelationshipId(relationship: GeneratedRelationship, index: number): string {
  return `${toIdentifier(relationship.n) || 'relacionamento'}_${index + 1}`;
}

const attributeTypes = {
  s: 'string',
  n: 'number',
  b: 'boolean',
  d: 'date',
  dt: 'datetime',
  t: 'text',
  dec: 'decimal',
  u: 'uuid',
  e: 'email',
  p: 'phone',
  x: 'unknown',
} as const satisfies Record<GeneratedAttribute['t'], Attribute['type']>;

function expandAttributeType(type: GeneratedAttribute['t']): Attribute['type'] {
  return attributeTypes[type];
}

function compactAttributeType(type: Attribute['type']): GeneratedAttribute['t'] {
  const entry = Object.entries(attributeTypes).find(([, expandedType]) => expandedType === type);
  return (entry?.[0] as GeneratedAttribute['t'] | undefined) ?? 'x';
}

function uniqueId(baseId: string, usedIds: Set<string>): string {
  const safeBaseId = baseId || 'elemento';
  let candidate = safeBaseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${safeBaseId}_${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toIdentifier(value: string): string {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
