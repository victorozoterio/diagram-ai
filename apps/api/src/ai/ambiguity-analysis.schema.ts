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
    const normalizedOptions = question.options.map(normalizeOption);
    const hasCardinalityOption = question.options.some((option) => cardinalityLabel(option));
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'As opções de uma pergunta de ambiguidade devem ser distintas.',
      });
    }

    if (question.kind === 'cardinality' && !question.participants) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'Perguntas de cardinalidade devem informar os dois participantes na ordem das opções.',
      });
    }

    if (hasCardinalityOption && question.kind !== 'cardinality') {
      context.addIssue({
        code: 'custom',
        path: ['kind'],
        message: 'Opções com cardinalidade devem declarar kind="cardinality".',
      });
    }

    if (question.kind === 'cardinality' && question.participants) {
      validateCardinalityOptions(question, context);
    }
  });

export const AmbiguityAnalysisSchema = z
  .object({
    requiresClarification: z.boolean(),
    questions: z.array(AmbiguityQuestionSchema).max(5),
  })
  .superRefine((analysis, context) => {
    const questionIds = analysis.questions.map((question) => question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'As perguntas de ambiguidade devem possuir identificadores distintos.',
      });
    }

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

const AmbiguityAnalysisEnvelopeSchema = z.object({
  requiresClarification: z.boolean(),
  questions: z.array(z.unknown()),
});

const CARDINALITY_LABELS = ['1:1', '1:N', 'N:1', 'N:N'] as const;
const MANY_WORD = String.raw`(?:vários|varios|muitas|muitos|diversos|diversas|mais\s+de\s+um(?:a)?)`;

type CardinalityQuestion = {
  options: string[];
  participants?: [string, string];
};

function validateCardinalityOptions(question: CardinalityQuestion, context: z.RefinementCtx): void {
  if (question.options.length !== CARDINALITY_LABELS.length) {
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Uma pergunta de cardinalidade deve oferecer exatamente as opções 1:1, 1:N, N:1 e N:N.',
    });
    return;
  }

  const labels = question.options.map(cardinalityLabel);
  if (
    labels.some((label) => !label) ||
    new Set(labels).size !== CARDINALITY_LABELS.length ||
    CARDINALITY_LABELS.some((label) => !labels.includes(label))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'As opções de cardinalidade devem conter uma única alternativa para 1:1, 1:N, N:1 e N:N.',
    });
    return;
  }

  const [firstParticipant, secondParticipant] = question.participants ?? [];
  if (!firstParticipant || !secondParticipant) return;

  for (const option of question.options) {
    const label = cardinalityLabel(option);
    if (!label) continue;

    const firstIsMany = mentionsMany(option, firstParticipant);
    const secondIsMany = mentionsMany(option, secondParticipant);
    const expected = expectedManyParticipants(label);

    if (firstIsMany !== expected.first || secondIsMany !== expected.second) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: `A descrição da opção ${label} contradiz sua cardinalidade declarada.`,
      });
      return;
    }
  }
}

function cardinalityLabel(option: string): (typeof CARDINALITY_LABELS)[number] | undefined {
  const match = option.match(/\((1:1|1:N|N:1|N:N)\)\s*$/i);
  return match?.[1].toUpperCase() as (typeof CARDINALITY_LABELS)[number] | undefined;
}

function expectedManyParticipants(label: (typeof CARDINALITY_LABELS)[number]) {
  return {
    first: label === 'N:1' || label === 'N:N',
    second: label === '1:N' || label === 'N:N',
  };
}

function mentionsMany(option: string, participant: string): boolean {
  const normalizedParticipant = normalizeOption(participant);
  const escapedParticipant = normalizedParticipant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const participantPattern = `${escapedParticipant}(?:s|es)?`;
  return new RegExp(`\\b${MANY_WORD}\\s+${participantPattern}\\b`, 'iu').test(normalizeOption(option));
}

function normalizeOption(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aproveita perguntas válidas de uma resposta parcialmente inválida do modelo.
 * Falhas no envelope ainda são tratadas como falhas técnicas pelo provider.
 */
export function normalizeAmbiguityAnalysis(value: unknown): {
  analysis: AmbiguityAnalysis;
  discardedQuestionCount: number;
  repairedQuestionCount: number;
  discardedQuestions: Array<{ index: number; question: unknown; reason: unknown }>;
} {
  const envelope = AmbiguityAnalysisEnvelopeSchema.parse(value);
  if (!envelope.requiresClarification) {
    return {
      analysis: { requiresClarification: false, questions: [] },
      discardedQuestionCount: 0,
      repairedQuestionCount: 0,
      discardedQuestions: [],
    };
  }

  let discardedQuestionCount = 0;
  let repairedQuestionCount = 0;
  const discardedQuestions: Array<{ index: number; question: unknown; reason: unknown }> = [];
  const questionIds = new Set<string>();
  const questions = envelope.questions.slice(0, 5).flatMap((question, index) => {
    const sanitized = sanitizeAmbiguityQuestion(question);
    if (sanitized.repaired) repairedQuestionCount += 1;

    const parsed = AmbiguityQuestionSchema.safeParse(sanitized.question);
    if (parsed.success && !questionIds.has(parsed.data.id)) {
      questionIds.add(parsed.data.id);
      return [parsed.data];
    }

    discardedQuestionCount += 1;
    discardedQuestions.push({
      index,
      question,
      reason: parsed.success ? 'Identificador de pergunta duplicado.' : z.treeifyError(parsed.error),
    });
    return [];
  });

  return {
    analysis: {
      requiresClarification: questions.length > 0,
      questions,
    },
    discardedQuestionCount,
    repairedQuestionCount,
    discardedQuestions,
  };
}

function sanitizeAmbiguityQuestion(question: unknown): { question: unknown; repaired: boolean } {
  if (!question || typeof question !== 'object' || !Array.isArray((question as { options?: unknown }).options)) {
    return { question, repaired: false };
  }

  const options = (question as { options: unknown[] }).options;
  const uniqueOptions = options.filter(
    (option, index) =>
      typeof option !== 'string' ||
      options.findIndex(
        (candidate) => typeof candidate === 'string' && normalizeOption(candidate) === normalizeOption(option),
      ) === index,
  );

  const sanitizedQuestion = { ...question, options: uniqueOptions } as {
    kind?: unknown;
    participants?: unknown;
    options: unknown[];
  };
  const repaired = uniqueOptions.length !== options.length;
  if (sanitizedQuestion.kind !== 'cardinality') {
    return { question: sanitizedQuestion, repaired };
  }

  if (!isParticipantsPair(sanitizedQuestion.participants)) {
    return { question: asStructuralQuestion(sanitizedQuestion), repaired: true };
  }
  const participants = sanitizedQuestion.participants;

  const labels = sanitizedQuestion.options
    .filter((option): option is string => typeof option === 'string')
    .map(cardinalityLabel)
    .filter((label): label is (typeof CARDINALITY_LABELS)[number] => Boolean(label));

  if (labels.length === CARDINALITY_LABELS.length && new Set(labels).size === CARDINALITY_LABELS.length) {
    if (AmbiguityQuestionSchema.safeParse(sanitizedQuestion).success) {
      return { question: sanitizedQuestion, repaired };
    }

    return {
      question: {
        ...sanitizedQuestion,
        options: CARDINALITY_LABELS.map((label) => cardinalityOption(participants, label)),
      },
      repaired: true,
    };
  }

  // Quando a IA não fornece labels confiáveis, preservamos a pergunta como
  // estrutural: a resposta textual ainda orienta a geração, sem inventar uma
  // cardinalidade estruturada a partir de uma opção ambígua.
  return { question: asStructuralQuestion(sanitizedQuestion), repaired: true };
}

function isParticipantsPair(value: unknown): value is [string, string] {
  return Array.isArray(value) && value.length === 2 && value.every((participant) => typeof participant === 'string');
}

function cardinalityOption(participants: [string, string], label: (typeof CARDINALITY_LABELS)[number]): string {
  const [first, second] = participants;
  const statements = {
    '1:1': `Cada ${first} se relaciona com um ${second}, e cada ${second} se relaciona com um ${first}`,
    '1:N': `Um ${first} pode se relacionar com vários ${second}, e cada ${second} se relaciona com um ${first}`,
    'N:1': `Cada ${first} se relaciona com um ${second}, e um ${second} pode se relacionar com vários ${first}`,
    'N:N': `Um ${first} pode se relacionar com vários ${second}, e um ${second} pode se relacionar com vários ${first}`,
  } as const;

  return `${statements[label]} (${label})`;
}

function asStructuralQuestion(question: { options: unknown[]; kind?: unknown; participants?: unknown }): unknown {
  return {
    ...question,
    kind: 'structural',
    participants: undefined,
    options: question.options.map((option) =>
      typeof option === 'string'
        ? option.replace(/\s*(?:\[|\()(?:1:1|1:N|N:1|N:N)(?:\]|\))\s*[.!?]?\s*$/i, '').trim()
        : option,
    ),
  };
}

export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;
export type AmbiguityAnalysis = z.infer<typeof AmbiguityAnalysisSchema>;
export const AmbiguityAnalysisJsonSchema = z.toJSONSchema(AmbiguityAnalysisSchema);
