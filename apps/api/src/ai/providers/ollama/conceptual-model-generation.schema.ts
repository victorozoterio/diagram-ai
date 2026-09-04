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
  f: z.array(GeneratedAttributeFlagSchema).optional(),
  c: z.array(GeneratedComponentSchema).optional(),
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
  p: z.array(GeneratedParticipantSchema).length(2),
  a: z.array(GeneratedAttributeSchema).optional(),
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
