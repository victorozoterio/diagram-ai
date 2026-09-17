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
  c: z.enum(['1', 'N']),
});

const GeneratedRelationshipSchema = z.object({
  n: z.string().min(1),
  k: z.enum(['relationship', 'identifying-relationship', 'generalization', 'specialization']).optional(),
  s: z.string().min(1).optional().describe('Nome da entidade supertipo para generalização/especialização.'),
  d: z.array(z.string().min(1)).min(1).optional().describe('Nomes das entidades subtipos.'),
  p: z.array(GeneratedParticipantSchema).default([]),
  a: z.array(GeneratedAttributeSchema).optional().describe('Atributos que dependem da associação.'),
});

export const GeneratedConceptualModelSchema = z.object({
  e: z.array(GeneratedEntitySchema).min(1),
  r: z.array(GeneratedRelationshipSchema),
  q: z.array(z.string().min(1)).optional(),
});

export type GeneratedAttribute = z.infer<typeof GeneratedAttributeSchema>;
export type GeneratedConceptualModel = z.infer<typeof GeneratedConceptualModelSchema>;
export type GeneratedRelationship = z.infer<typeof GeneratedRelationshipSchema>;
export const GeneratedConceptualModelJsonSchema = z.toJSONSchema(GeneratedConceptualModelSchema);
