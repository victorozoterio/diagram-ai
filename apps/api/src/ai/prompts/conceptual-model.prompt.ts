type BuildConceptualModelPromptInput = {
  description: string;
};

export function buildConceptualModelPrompt({ description }: BuildConceptualModelPromptInput): string {
  return `
Você é um especialista em modelagem conceitual de banco de dados.

Transforme a descrição abaixo em um modelo conceitual.

DESCRIÇÃO:
${description}

REGRAS SEMÂNTICAS:
- Não invente entidades ou atributos sem evidência.
- Use IDs descritivos, em minúsculo, sem espaços e sem acentos.
- Só marque "identifier": true quando houver evidência de que o atributo identifica a entidade.
- Só marque "unique": true quando a descrição indicar unicidade.
- Marque "multivalued": true somente quando houver múltiplos valores.
- Marque "composite": true somente quando o atributo possuir componentes.
- Marque "derived": true somente quando o atributo puder ser calculado.
- Escolha corretamente as cardinalidades dos relacionamentos.
- Se houver ambiguidade real, registre em "ambiguities".
`.trim();
}
