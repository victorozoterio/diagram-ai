import { z } from 'zod';

const GeneratedAttributeTypeSchema = z.enum(['s', 'n', 'b', 'd', 'dt', 't', 'dec', 'u', 'e', 'p', 'x']);
const GeneratedAttributeFlagSchema = z.enum(['i', 'r', 'u', 'm', 'c', 'd']);

const GeneratedComponentSchema = z.object({
  n: z.string().min(1),
  t: GeneratedAttributeTypeSchema,
});

const GeneratedAttributeSchema = z.object({
  n: z.string().min(1),
  t: GeneratedAttributeTypeSchema,
  f: z
    .array(GeneratedAttributeFlagSchema)
    .optional()
    .describe('c e m são independentes; m exige multiplicidade explícita; i exige chave explícita.'),
  c: z.array(GeneratedComponentSchema).min(1).optional().describe('Sua presença exige a flag c no atributo pai.'),
});

const GeneratedEntitySchema = z.object({
  n: z.string().min(1),
  a: z.array(GeneratedAttributeSchema).optional(),
});

const GeneratedParticipantSchema = z.object({
  e: z.string().min(1),
  c: z
    .enum(['1', 'N'])
    .describe(
      'Cardinalidade exibida ao lado desta entidade no DER. Em "A possui vários B e cada B pertence a um A", A usa "1" e B usa "N"; não inverta os participantes.',
    ),
});

const GeneratedRegularRelationshipSchema = z.object({
  n: z.string().min(1),
  k: z
    .enum(['relationship', 'identifying-relationship'])
    .optional()
    .describe('Relacionamento comum ou identificador entre entidades participantes.'),
  p: z.array(GeneratedParticipantSchema).min(2),
  a: z
    .array(GeneratedAttributeSchema)
    .optional()
    .describe('Dados que dependem da associação; nomes de entidades participantes não são atributos.'),
});

const GeneratedGeneralizationSchema = z.object({
  n: z.string().min(1),
  k: z.enum(['generalization', 'specialization']),
  s: z.string().min(1).describe('Nome da única entidade supertipo.'),
  d: z.array(z.string().min(1)).min(1).describe('Nomes de uma ou mais entidades subtipos.'),
});

const GeneratedRelationshipSchema = z.union([GeneratedRegularRelationshipSchema, GeneratedGeneralizationSchema]);

export const GeneratedConceptualModelSchema = z.object({
  e: z.array(GeneratedEntitySchema).min(1),
  r: z.array(GeneratedRelationshipSchema),
  q: z.array(z.string().min(1)).optional(),
});

export type GeneratedAttribute = z.infer<typeof GeneratedAttributeSchema>;
export type GeneratedConceptualModel = z.infer<typeof GeneratedConceptualModelSchema>;
export type GeneratedRelationship = z.infer<typeof GeneratedRelationshipSchema>;
export const GeneratedConceptualModelJsonSchema = z.toJSONSchema(GeneratedConceptualModelSchema);
