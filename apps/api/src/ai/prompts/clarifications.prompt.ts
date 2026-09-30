import type { ClarificationAnswer } from '../ambiguity-analysis.schema';

export function formatClarifications(clarifications?: ClarificationAnswer[]): string {
  if (!clarifications?.length) return '';

  const answers = clarifications.map(({ questionId, answers }) => `- ${questionId}: ${answers.join(' | ')}`).join('\n');
  return `

ESCLARECIMENTOS EXPLÍCITOS DO USUÁRIO:
${answers}

As respostas explícitas acima têm precedência sobre inferências. Preserve a descrição original para tudo que não foi esclarecido.
`;
}
