import { z } from 'zod';

export const AmbiguityQuestionKindSchema = z.enum(['cardinality', 'structural']);

const CardinalityValueSchema = z.enum(['1', 'N']);

export const CardinalityClarificationSchema = z.object({
  participants: z
    .tuple([
      z.object({ entity: z.string().min(1), cardinality: CardinalityValueSchema }),
      z.object({ entity: z.string().min(1), cardinality: CardinalityValueSchema }),
    ])
    .refine(
      ([first, second]) => first.entity !== second.entity,
      'Os participantes da cardinalidade devem ser distintos.',
    ),
});

export const ClarificationAnswerSchema = z.object({
  questionId: z.string().min(1),
  answers: z.array(z.string().min(1)).min(1),
  questionText: z.string().min(1).optional(),
  kind: AmbiguityQuestionKindSchema.optional(),
  cardinality: CardinalityClarificationSchema.optional(),
});

export const AmbiguityQuestionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    kind: AmbiguityQuestionKindSchema.default('structural'),
    options: z.array(z.string().min(1)).min(2),
    allowsMultipleSelection: z.boolean(),
    allowsCustomAnswer: z.boolean(),
    participants: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  })
  .superRefine((question, context) => {
    if (question.kind === 'cardinality' && !question.participants) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'Perguntas de cardinalidade devem informar os dois participantes na ordem das opções.',
      });
    }
  });

export const AmbiguityAnalysisSchema = z
  .object({
    requiresClarification: z.boolean(),
    questions: z.array(AmbiguityQuestionSchema).max(5),
  })
  .superRefine((analysis, context) => {
    if (analysis.requiresClarification && analysis.questions.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A análise requer esclarecimento, mas não contém perguntas.',
        path: ['questions'],
      });
    }

    if (!analysis.requiresClarification && analysis.questions.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Uma análise sem necessidade de esclarecimento não pode conter perguntas.',
        path: ['questions'],
      });
    }
  });

export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;
export type AmbiguityAnalysis = z.infer<typeof AmbiguityAnalysisSchema>;
export const AmbiguityAnalysisJsonSchema = z.toJSONSchema(AmbiguityAnalysisSchema);
