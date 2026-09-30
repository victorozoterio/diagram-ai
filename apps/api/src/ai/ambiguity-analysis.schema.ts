import { z } from 'zod';

export const ClarificationAnswerSchema = z.object({
  questionId: z.string().min(1),
  answers: z.array(z.string().min(1)).min(1),
});

export const AmbiguityQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  allowsMultipleSelection: z.boolean(),
  allowsCustomAnswer: z.boolean(),
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
