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
    // Preenchido pelo servidor depois de validar as opções; nunca depende do texto interpretado pelo frontend.
    optionCardinalities: z
      .array(z.object({ optionIndex: z.number().int().nonnegative(), cardinality: CardinalityClarificationSchema }))
      .optional(),
    optionIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((question, context) => {
    const normalizedOptions = question.options.map(normalizeOption);
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

// Schema enviado ao Ollama: para perguntas de cardinalidade, participantes
// fazem parte do contrato de saída e não são uma convenção apenas do prompt.
const AmbiguityQuestionOutputBaseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  allowsMultipleSelection: z.boolean(),
  allowsCustomAnswer: z.boolean(),
});

const CardinalityAmbiguityQuestionOutputSchema = AmbiguityQuestionOutputBaseSchema.extend({
  kind: z.literal('cardinality'),
  participants: z.tuple([z.string().min(1), z.string().min(1)]),
});

const StructuralAmbiguityQuestionOutputSchema = AmbiguityQuestionOutputBaseSchema.extend({
  kind: z.literal('structural'),
});

const AmbiguityAnalysisOutputSchema = z.object({
  requiresClarification: z.boolean(),
  questions: z
    .array(z.union([CardinalityAmbiguityQuestionOutputSchema, StructuralAmbiguityQuestionOutputSchema]))
    .max(5),
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

    const parsed = AmbiguityQuestionSchema.safeParse(sanitized.question);
    if (parsed.success && !questionIds.has(parsed.data.id)) {
      if (sanitized.repaired) repairedQuestionCount += 1;
      questionIds.add(parsed.data.id);
      const {
        optionCardinalities: _ignoredCardinalities,
        optionIds: _ignoredOptionIds,
        ...validatedQuestion
      } = parsed.data;
      if (validatedQuestion.kind !== 'cardinality' || !validatedQuestion.participants) return [validatedQuestion];

      const [firstEntity, secondEntity] = validatedQuestion.participants;
      return [
        {
          ...validatedQuestion,
          optionIds: validatedQuestion.options.map((_, optionIndex) => `${validatedQuestion.id}:${optionIndex}`),
          optionCardinalities: validatedQuestion.options.map((option, optionIndex) => {
            const [first, second] = cardinalityLabel(option)?.split(':') as ['1' | 'N', '1' | 'N'];
            return {
              optionIndex,
              cardinality: {
                participants: [
                  { entity: firstEntity, cardinality: first },
                  { entity: secondEntity, cardinality: second },
                ],
              },
            };
          }),
        },
      ];
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
    text?: unknown;
    options: unknown[];
  };
  let repaired = uniqueOptions.length !== options.length;
  const hasCardinalityChoices = sanitizedQuestion.options.some(
    (option) => typeof option === 'string' && cardinalityLabel(option) !== undefined,
  );
  if (sanitizedQuestion.kind !== 'cardinality' && !hasCardinalityChoices) {
    return { question: sanitizedQuestion, repaired };
  }

  let participants: [string, string];
  if (!isParticipantsPair(sanitizedQuestion.participants)) {
    const inferredParticipants = inferCardinalityParticipants(sanitizedQuestion);
    if (!inferredParticipants) {
      // Sem dois participantes, a escolha não pode gerar uma constraint segura.
      return { question: { ...sanitizedQuestion, kind: 'cardinality' }, repaired: true };
    }
    sanitizedQuestion.participants = inferredParticipants;
    participants = inferredParticipants;
    repaired = true;
  } else {
    participants = sanitizedQuestion.participants;
  }
  sanitizedQuestion.kind = 'cardinality';

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

  // Os participantes foram identificados, mas a IA omitiu/trocou os rótulos.
  // Reconstrói as quatro escolhas canônicas para não perder a constraint.
  return {
    question: {
      ...sanitizedQuestion,
      options: CARDINALITY_LABELS.map((label) => cardinalityOption(participants, label)),
    },
    repaired: true,
  };
}

/**
 * Compatibilidade com respostas antigas do modelo que ainda omitem participants.
 * A inferência ocorre antes da UI, a partir da pergunta e das quatro opções,
 * para construir a metadata estrutural; nunca interpreta uma resposta escolhida.
 */
function inferCardinalityParticipants(question: { text?: unknown; options: unknown[] }): [string, string] | undefined {
  const candidateCounts = new Map<string, { value: string; count: number; firstIndex: number }>();
  const source = [question.text, ...question.options].filter((value): value is string => typeof value === 'string');
  let index = 0;

  for (const value of source) {
    for (const match of value.matchAll(/\b(?:cada|um|uma)\s+([\p{L}][\p{L}-]*)/giu)) {
      const original = singularizeParticipant(match[1]);
      if (!original || isParticipantStopWord(original)) continue;
      const key = normalizeOption(original);
      const candidate = candidateCounts.get(key);
      if (candidate) candidate.count += 1;
      else candidateCounts.set(key, { value: original, count: 1, firstIndex: index });
      index += 1;
    }
  }

  const participants = [...candidateCounts.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
    .slice(0, 2)
    .map(({ value }) => value);

  return participants.length === 2 && participants[0] !== participants[1]
    ? [participants[0], participants[1]]
    : undefined;
}

function singularizeParticipant(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('ões')) return `${normalized.slice(0, -3)}ão`;
  if (normalized.endsWith('ães')) return `${normalized.slice(0, -3)}ão`;
  if (normalized.endsWith('ns')) return `${normalized.slice(0, -2)}m`;
  if (normalized.endsWith('s') && normalized.length > 2) return normalized.slice(0, -1);
  return normalized;
}

function isParticipantStopWord(value: string): boolean {
  return new Set(['modelo', 'sistema', 'relacao', 'relacionamento', 'vinculo']).has(normalizeOption(value));
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

export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;
export type AmbiguityAnalysis = z.infer<typeof AmbiguityAnalysisSchema>;
export const AmbiguityAnalysisJsonSchema = z.toJSONSchema(AmbiguityAnalysisOutputSchema);
