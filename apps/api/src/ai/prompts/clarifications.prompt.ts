import type { ClarificationAnswer } from '../ambiguity-analysis.schema';

export function formatClarifications(clarifications?: ClarificationAnswer[]): string {
  if (!clarifications?.length) return '';

  const answers = clarifications
    .map(({ questionId, questionText, kind, answers, cardinality }) => {
      const question = questionText ? `Pergunta: ${questionText}. ` : '';
      const category = kind === 'cardinality' ? 'CARDINALIDADE CONFIRMADA' : 'ESCLARECIMENTO ESTRUTURAL';
      const constraint = cardinality
        ? ` Restrição estrutural obrigatória: p=${JSON.stringify(
            cardinality.participants.map((participant) => ({ e: participant.entity, c: participant.cardinality })),
          )}.`
        : '';
      return `- ${category}. ${question}Resposta: ${answers.join(' | ')}.${constraint} [id: ${questionId}]`;
    })
    .join('\n');
  return `

ESCLARECIMENTOS EXPLÍCITOS DO USUÁRIO:
${answers}

As respostas explícitas acima têm precedência sobre inferências. Uma CARDINALIDADE CONFIRMADA resolve uma associação regular entre seus participantes: represente-a em r com p e as cardinalidades respondidas. Quando houver uma "Restrição estrutural obrigatória", copie exatamente seus participantes e valores c para o relacionamento correspondente; ela é vinculante e não pode ser invertida. Ela nunca cria uma entidade, atributo composto ou generalização/especialização. Generalização só pode ser criada quando a descrição original ou um ESCLARECIMENTO ESTRUTURAL declarar explicitamente uma relação de tipo/categoria. Preserve a descrição original para tudo que não foi esclarecido.
`;
}
