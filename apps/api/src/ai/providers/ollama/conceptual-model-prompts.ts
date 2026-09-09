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

Use DER Chen: o backend adiciona identificadores técnicos; use i fora deles somente quando a descrição disser que o atributo identifica a entidade ou é sua chave; unicidade potencial, CPF, email, código ou matrícula não bastam; nenhuma foreign key; N:N como relacionamento; dados que dependem do par ficam em a do relacionamento; atributo composto exige f com c e componentes não vazios em c; c não implica m, que exige multiplicidade explícita; atributos da entidade ficam somente nela; cardinalidades fiéis ao texto. Una frases inversas que descrevam o mesmo relacionamento. Preserve todas as entidades e relações explícitas.

Ao corrigir composição: se um atributo já possui componentes em c, preserve-os e inclua c em f. Se f contém c sem componentes, use somente partes declaradas na descrição original; se não houver partes, remova a flag c. Nunca substitua c por m.

Retorne somente o JSON compacto aceito pelo schema, usando as mesmas chaves e códigos da entrada inválida. Não gere ids internos, metadata ou descriptions; use flags apenas para valores verdadeiros e omita arrays opcionais vazios.
`.trim();
}
