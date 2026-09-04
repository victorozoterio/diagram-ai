export function buildFixConceptualModelPrompt(params: {
  description: string;
  invalidModel: unknown;
  validationError: unknown;
}): string {
  return `
Corrija o modelo conceitual preservando tudo que já está correto.

DESCRIÇÃO ORIGINAL:
${params.description}

MODELO INVÁLIDO:
${JSON.stringify(params.invalidModel)}

ERROS DE VALIDAÇÃO:
${JSON.stringify(params.validationError)}

Use DER Chen: o backend adiciona identificadores técnicos; nenhuma foreign key; N:N como relacionamento; atributos da associação somente no relacionamento; atributos da entidade somente nela; composição sem duplicidade; cardinalidades fiéis ao texto. Una frases inversas que descrevam o mesmo relacionamento. Preserve todas as entidades e relações explícitas.

Retorne somente o JSON compacto aceito pelo schema, usando as mesmas chaves e códigos da entrada inválida. Não gere ids internos, metadata ou descriptions; use flags apenas para valores verdadeiros e omita arrays opcionais vazios.
`.trim();
}
