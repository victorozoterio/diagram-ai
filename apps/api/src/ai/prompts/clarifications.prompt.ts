import type { ClarificationAnswer } from '../ambiguity-analysis.schema';

export function formatClarifications(clarifications?: ClarificationAnswer[]): string {
  if (!clarifications?.length) return '';

  const answers = clarifications
    .map(({ questionId, questionText, kind, answers }) => {
      const question = questionText ? `Pergunta: ${questionText}. ` : '';
      const category = kind === 'cardinality' ? 'CARDINALIDADE CONFIRMADA' : 'ESCLARECIMENTO ESTRUTURAL';
      return `- ${category}. ${question}Resposta: ${answers.join(' | ')} [id: ${questionId}]`;
    })
    .join('\n');
  return `

ESCLARECIMENTOS EXPLÍCITOS DO USUÁRIO:
${answers}

As respostas explícitas acima têm precedência sobre inferências. Uma CARDINALIDADE CONFIRMADA resolve uma associação regular entre seus participantes: represente-a em r com p e as cardinalidades respondidas. Ela nunca cria uma entidade, atributo composto ou generalização/especialização. Generalização só pode ser criada quando a descrição original ou um ESCLARECIMENTO ESTRUTURAL declarar explicitamente uma relação de tipo/categoria. Preserve a descrição original para tudo que não foi esclarecido.
`;
}
