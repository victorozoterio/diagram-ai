import type { AmbiguityAnalysis } from './ambiguity-analysis.schema';

type CardinalityFact = {
  from: string;
  to: string;
};

const WORD = String.raw`\p{L}+`;
const SUBJECT = String.raw`(?!(?:e|um|uma|cada)\b)${WORD}`;
const MANY_WORD = String.raw`(?:vários|varios|muitas|muitos|diversos|diversas|mais\s+de\s+um(?:a)?)`;

/**
 * Remove perguntas de cardinalidade que contradizem multiplicidades
 * explicitamente definidas na descrição.
 */
export function discardResolvedCardinalityQuestions(
  description: string,
  analysis: AmbiguityAnalysis,
): AmbiguityAnalysis {
  const questionsWithKinds = analysis.questions.map((question) => ({
    ...question,
    kind: isCardinalityQuestion(question) ? 'cardinality' : question.kind,
  }));
  const resolvedPairs = findResolvedRelationPairs(description);
  if (!resolvedPairs.size) {
    return { ...analysis, questions: questionsWithKinds };
  }

  const questions = questionsWithKinds.filter(
    (question) => !isCardinalityQuestion(question) || !referencesResolvedPair(question, resolvedPairs),
  );

  return {
    requiresClarification: questions.length > 0,
    questions,
  };
}

function findResolvedRelationPairs(description: string): Set<string> {
  const facts = extractCardinalityFacts(description);
  const directions = new Set(facts.map(({ from, to }) => `${from}->${to}`));
  const resolvedPairs = new Set<string>();

  for (const { from, to } of facts) {
    if (directions.has(`${to}->${from}`)) {
      resolvedPairs.add(pairKey(from, to));
    }
  }

  return resolvedPairs;
}

function extractCardinalityFacts(description: string): CardinalityFact[] {
  const normalized = normalizeText(description);
  const facts: CardinalityFact[] = [];

  // "Um autor pode escrever vários livros" defines author -> book.
  const manyPattern = new RegExp(
    String.raw`\b(?:e\s+)?(?:(?:um|uma|cada)\s+)?(${SUBJECT})\s+(?:(?:pode|podem)\s+)?(?:${WORD}\s+){0,5}?${MANY_WORD}\s+(${WORD})`,
    'gu',
  );

  // "Cada pedido pertence a apenas um cliente" defines order -> client.
  // The alternatives deliberately require a singular quantifier immediately
  // before the target, so a phrase containing "vários" is never read as one.
  const onePattern = new RegExp(
    String.raw`\b(?:e\s+)?(?:(?:um|uma|cada)\s+)?(${SUBJECT})\s+(?:(?:pode|podem)\s+)?(?:pertence\s+(?:a|somente\s+a)|e\s+de|e\s+associado\s+a|tem|possui|ter|possuir)\s+(?:(?:apenas|somente)\s+)?(?:um|uma)\s+(${WORD})`,
    'gu',
  );

  collectFacts(manyPattern, normalized, facts);
  collectFacts(onePattern, normalized, facts);
  return facts;
}

function collectFacts(pattern: RegExp, text: string, facts: CardinalityFact[]): void {
  for (const match of text.matchAll(pattern)) {
    const from = canonicalTerm(match[1]);
    const to = canonicalTerm(match[2]);
    if (from && to && from !== to) facts.push({ from, to });
  }
}

function isCardinalityQuestion(question: AmbiguityAnalysis['questions'][number]): boolean {
  return (
    normalizeText(question.id).includes('cardinalidade') ||
    question.options.some((option) => /\((?:1:1|1:n|n:1|n:n)\)/i.test(option))
  );
}

function referencesResolvedPair(question: AmbiguityAnalysis['questions'][number], resolvedPairs: Set<string>): boolean {
  if (question.participants && resolvedPairs.has(pairKey(question.participants[0], question.participants[1]))) {
    return true;
  }

  const terms = new Set(
    normalizeText([question.id, question.text, ...question.options].join(' '))
      .match(/\p{L}+/gu)
      ?.map(canonicalTerm),
  );

  return [...resolvedPairs].some((pair) => {
    const [first, second] = pair.split('|');
    return terms.has(first) && terms.has(second);
  });
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function canonicalTerm(value: string): string {
  const normalized = normalizeText(value);
  if (normalized.endsWith('es') && normalized.length > 3) return normalized.slice(0, -2);
  if (normalized.endsWith('s') && normalized.length > 2) return normalized.slice(0, -1);
  return normalized;
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}
