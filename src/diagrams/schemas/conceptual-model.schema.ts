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

export const RelationshipSchema = z.object({
  id: z.string().min(1, 'O relacionamento deve possuir um identificador único.'),
  name: z.string().min(1, 'O relacionamento deve possuir um nome.'),
  description: z.string().optional(),
  type: CardinalitySchema,
  participants: z
    .array(RelationshipParticipantSchema)
    .min(2, 'O relacionamento deve possuir pelo menos duas entidades.'),
  attributes: z.array(AttributeSchema).default([]),
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

export const ConceptualModelSchema = z.object({
  metadata: ConceptualModelMetadataSchema.default({}),
  entities: z.array(EntitySchema).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  ambiguities: z.array(AmbiguitySchema).default([]),
});

export type AttributeType = z.infer<typeof AttributeTypeSchema>;
export type Cardinality = z.infer<typeof CardinalitySchema>;
export type Attribute = z.infer<typeof AttributeSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type RelationshipParticipant = z.infer<typeof RelationshipParticipantSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Ambiguity = z.infer<typeof AmbiguitySchema>;
export type ConceptualModelMetadata = z.infer<typeof ConceptualModelMetadataSchema>;
export type ConceptualModel = z.infer<typeof ConceptualModelSchema>;
