import { z } from 'zod';

export const AttributeTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'text',
  'decimal',
  'uuid',
  'email',
  'phone',
  'unknown',
]);

export const CardinalitySchema = z.enum(['1:1', '1:N', 'N:N']);

export const AttributeSchema = z.object({
  id: z.string().min(1, 'O atributo deve possuir um identificador único.'),
  name: z.string().min(1, 'O atributo deve possuir um nome.'),
  type: AttributeTypeSchema.default('unknown'),
  description: z.string().optional(),
  identifier: z.boolean().default(false),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  multivalued: z.boolean().default(false),
  composite: z.boolean().default(false),
  derived: z.boolean().default(false),
  components: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: AttributeTypeSchema.default('unknown'),
      }),
    )
    .default([]),
  connectionHandle: z.string().optional(),
  entityHandle: z.string().optional(),
});

export const EntitySchema = z.object({
  id: z.string().min(1, 'A entidade deve possuir um identificador único.'),
  name: z.string().min(1, 'A entidade deve possuir um nome.'),
  description: z.string().optional(),
  attributes: z.array(AttributeSchema).default([]),
});

export const RelationshipParticipantSchema = z.object({
  entityId: z.string().min(1, 'O relacionamento deve informar a entidade participante.'),
  role: z.string().optional(),
  cardinality: z.enum(['1', 'N']).describe('Cardinalidade da entidade dentro do relacionamento.'),
});

const RelationshipKindSchema = z.enum(['relationship', 'identifying-relationship', 'generalization', 'specialization']);

const GeneralizationHandleSchema = z.object({
  entityHandle: z.string().optional(),
  connectionHandle: z.string().optional(),
});

export const RelationshipSchema = z.object({
  id: z.string().min(1, 'O relacionamento deve possuir um identificador único.'),
  name: z.string().min(1, 'O relacionamento deve possuir um nome.'),
  description: z.string().optional(),
  type: CardinalitySchema.default('1:N'),
  kind: RelationshipKindSchema.default('relationship'),
  participants: z.array(RelationshipParticipantSchema).default([]),
  attributes: z.array(AttributeSchema).default([]),
  supertypeId: z.string().min(1).optional(),
  subtypeIds: z.array(z.string().min(1)).default([]),
  supertypeHandles: GeneralizationHandleSchema.optional(),
  subtypeHandles: z.record(z.string(), GeneralizationHandleSchema).default({}),
});

export const AmbiguitySchema = z.object({
  id: z.string().min(1, 'A ambiguidade deve possuir um identificador.'),
  message: z.string().min(1, 'A ambiguidade deve possuir uma mensagem.'),
  field: z.string().optional(),
  suggestions: z.array(z.string()).default([]),
});

export const ConceptualModelMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  sourceText: z.string().optional(),
  generatedBy: z.string().optional(),
  generatedAt: z.string().optional(),
});

export const ConceptualModelStructureSchema = z.object({
  metadata: ConceptualModelMetadataSchema.default({}),
  entities: z.array(EntitySchema).default([]),
  standaloneAttributes: z.array(AttributeSchema).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  ambiguities: z.array(AmbiguitySchema).default([]),
});

export const ConceptualModelSchema = ConceptualModelStructureSchema.superRefine((model, context) => {
  const entityIds = new Set(model.entities.map((entity) => entity.id));
  const entityConceptNames = new Set(model.entities.map((entity) => normalizeSchemaName(entity.name)));

  model.entities.forEach((entity, entityIndex) => {
    if (isArtificialRelationshipIdentifier(entity.id) || isArtificialRelationshipIdentifier(entity.name)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entities', entityIndex],
        message: 'Relacionamentos não devem ser representados como entidades técnicas.',
      });
    }

    const expectedIdentifierName = `id_${toSchemaIdentifier(entity.name)}`;
    const technicalIdentifier = entity.attributes.find(
      (attribute) => attribute.identifier && attribute.name.toLowerCase() === expectedIdentifierName,
    );

    if (!technicalIdentifier) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entities', entityIndex, 'attributes'],
        message: `A entidade deve possuir o identificador técnico "${expectedIdentifierName}".`,
      });
    } else if (technicalIdentifier.type !== 'uuid' || !technicalIdentifier.required || !technicalIdentifier.unique) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entities', entityIndex, 'attributes'],
        message: 'O identificador técnico deve ser uuid, obrigatório e único.',
      });
    }

    entity.attributes.forEach((attribute, attributeIndex) => {
      if (!attribute.identifier && isForeignKeyName(attribute.name)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entities', entityIndex, 'attributes', attributeIndex],
          message: 'Foreign keys pertencem ao modelo lógico, não ao modelo conceitual Chen.',
        });
      }

      if (attribute.composite !== attribute.components.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entities', entityIndex, 'attributes', attributeIndex],
          message: 'Atributos compostos devem possuir componentes, e componentes exigem composite=true.',
        });
      }
    });
  });

  model.relationships.forEach((relationship, relationshipIndex) => {
    if (isGeneralization(relationship)) {
      validateGeneralization(relationship, relationshipIndex, entityIds, context);
      return;
    }

    if (relationship.participants.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relationships', relationshipIndex, 'participants'],
        message: 'O relacionamento deve possuir pelo menos duas entidades.',
      });
    }
    validateRelationshipCardinality(relationship, relationshipIndex, context);

    const participantAttributeNames = new Set(
      relationship.participants.flatMap((participant) => {
        const entity = model.entities.find((candidate) => candidate.id === participant.entityId);
        return entity?.attributes.map((attribute) => normalizeSchemaName(attribute.name)) ?? [];
      }),
    );

    relationship.participants.forEach((participant, participantIndex) => {
      if (!entityIds.has(participant.entityId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationships', relationshipIndex, 'participants', participantIndex, 'entityId'],
          message: 'O participante do relacionamento deve referenciar uma entidade existente.',
        });
      }
    });

    relationship.attributes.forEach((attribute, attributeIndex) => {
      if (
        attribute.identifier ||
        isArtificialRelationshipIdentifier(attribute.name) ||
        isForeignKeyName(attribute.name)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationships', relationshipIndex, 'attributes', attributeIndex],
          message: 'Relacionamentos não devem possuir identificadores técnicos nem foreign keys.',
        });
      }

      if (participantAttributeNames.has(normalizeSchemaName(attribute.name))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationships', relationshipIndex, 'attributes', attributeIndex],
          message: 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
        });
      }

      if (matchesEntityConcept(attribute.name, entityConceptNames)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationships', relationshipIndex, 'attributes', attributeIndex],
          message: 'Uma entidade existente deve participar do relacionamento, não ser representada como atributo.',
        });
      }
    });
  });
});

function matchesEntityConcept(attributeName: string, entityConceptNames: Set<string>): boolean {
  const normalizedAttributeName = normalizeSchemaName(attributeName);
  return [...entityConceptNames].some(
    (entityName) =>
      normalizedAttributeName === entityName ||
      normalizedAttributeName === `${entityName}s` ||
      entityName === `${normalizedAttributeName}s`,
  );
}

function isGeneralization(relationship: z.infer<typeof RelationshipSchema>): boolean {
  return relationship.kind === 'generalization' || relationship.kind === 'specialization';
}

function validateGeneralization(
  relationship: z.infer<typeof RelationshipSchema>,
  relationshipIndex: number,
  entityIds: Set<string>,
  context: z.RefinementCtx,
): void {
  if (!relationship.supertypeId || !entityIds.has(relationship.supertypeId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationships', relationshipIndex, 'supertypeId'],
      message: 'A generalização deve possuir um supertipo válido.',
    });
  }

  const uniqueSubtypes = new Set(relationship.subtypeIds);
  if (relationship.subtypeIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationships', relationshipIndex, 'subtypeIds'],
      message: 'A generalização deve possuir pelo menos um subtipo.',
    });
  }

  if (
    uniqueSubtypes.size !== relationship.subtypeIds.length ||
    relationship.subtypeIds.includes(relationship.supertypeId ?? '')
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationships', relationshipIndex, 'subtypeIds'],
      message: 'Os subtipos devem ser entidades distintas do supertipo.',
    });
  }

  relationship.subtypeIds.forEach((subtypeId, subtypeIndex) => {
    if (!entityIds.has(subtypeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relationships', relationshipIndex, 'subtypeIds', subtypeIndex],
        message: 'O subtipo deve referenciar uma entidade existente.',
      });
    }
  });
}

function isForeignKeyName(value: string): boolean {
  return value.toLowerCase().endsWith('_id');
}

function validateRelationshipCardinality(
  relationship: z.infer<typeof RelationshipSchema>,
  relationshipIndex: number,
  context: z.RefinementCtx,
): void {
  if (relationship.participants.length !== 2) {
    return;
  }

  const participantCardinalities = relationship.participants
    .map((participant) => participant.cardinality)
    .sort()
    .join(':');
  const expectedCardinalities = {
    '1:1': '1:1',
    '1:N': '1:N',
    'N:N': 'N:N',
  } as const;

  if (participantCardinalities !== expectedCardinalities[relationship.type]) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationships', relationshipIndex, 'participants'],
      message: 'As cardinalidades dos participantes devem corresponder ao tipo do relacionamento.',
    });
  }
}

function isArtificialRelationshipIdentifier(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return normalizedValue.startsWith('id_relacionamento_') || normalizedValue.startsWith('id_relationship_');
}

function toSchemaIdentifier(value: string): string {
  return normalizeSchemaName(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSchemaName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export type AttributeType = z.infer<typeof AttributeTypeSchema>;
export type Cardinality = z.infer<typeof CardinalitySchema>;
export type Attribute = z.infer<typeof AttributeSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type RelationshipParticipant = z.infer<typeof RelationshipParticipantSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Ambiguity = z.infer<typeof AmbiguitySchema>;
export type ConceptualModelMetadata = z.infer<typeof ConceptualModelMetadataSchema>;
export type ConceptualModel = z.infer<typeof ConceptualModelSchema>;
export const ConceptualModelJsonSchema = z.toJSONSchema(ConceptualModelStructureSchema);
