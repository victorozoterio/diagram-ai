export function buildFixConceptualModelPrompt(params: {
  description: string;
  invalidModel: unknown;
  validationError: unknown;
}): string {
  const targetedCorrections = buildTargetedCorrections(params.validationError);

  return `
Corrija o modelo conceitual preservando tudo que já está correto.

DESCRIÇÃO ORIGINAL:
${params.description}

MODELO INVÁLIDO:
${JSON.stringify(params.invalidModel)}

ERROS DE VALIDAÇÃO:
${JSON.stringify(params.validationError)}

CORREÇÃO PRIORITÁRIA DOS ERROS:
${targetedCorrections}

Use DER Chen: o backend adiciona identificadores técnicos; use i fora deles somente quando a descrição disser que o atributo identifica a entidade ou é sua chave; unicidade potencial, CPF, email, código ou matrícula não bastam; nenhuma foreign key; N:N como relacionamento; um conceito já reconhecido como entidade permanece entidade em menções posteriores no singular ou plural e participa dos relacionamentos, nunca vira atributo; "para cada X associado/incluído em Y, armazenar Z" coloca somente Z em a do relacionamento X-Y; dados que dependem do par ficam em a do relacionamento; atributo composto exige f com c e componentes não vazios em c; c não implica m, que exige multiplicidade explícita; multiplicidade entre entidades altera cardinalidade e não cria atributo multivalorado; atributos da entidade ficam somente nela; cardinalidades fiéis ao texto. Generalização/especialização usa k, s para um supertipo e d para um ou mais subtipos, sem p ou cardinalidades; só use-a quando o texto afirmar relação de "é um", "tipo de", "categoria" ou especialização. "Pode realizar, possuir, conter ou participar" indica associação, não generalização. Mantenha atributos comuns no supertipo e específicos nos subtipos sem duplicação. Para o mesmo supertipo e a mesma classificação, gere um único item de generalização e reúna todos os subtipos em d; nunca gere um Gen por subtipo nem um Gen sem s. Se um Gen inválido não tiver supertipo e o texto não trouxer hierarquia explícita, corrija-o para relacionamento comum em vez de inventar s. Una frases inversas que descrevam o mesmo relacionamento. Preserve todas as entidades e relações explícitas e não deixe isolada uma entidade relacionada no texto.

Retorne somente o JSON compacto aceito pelo schema, usando as mesmas chaves e códigos da entrada inválida. Não gere ids internos, metadata ou descriptions; use flags apenas para valores verdadeiros e omita arrays opcionais vazios.
`.trim();
}

function buildTargetedCorrections(validationError: unknown): string {
  const serializedError = JSON.stringify(validationError);
  const corrections: string[] = [];

  if (serializedError.includes('Uma entidade existente deve participar do relacionamento')) {
    corrections.push(
      '- Remova de r[].a todo atributo cujo nome corresponda no singular/plural a uma entidade de e.',
      '- Releia a descrição e crie ou preserve o relacionamento normal entre essa entidade X e a entidade Y à qual ela está associada/incluída/contida. Use p com X e Y e as cardinalidades descritas; não use k/s/d e não altere outro relacionamento para acomodar X.',
      '- Se o texto disser "para cada X associado a Y, armazenar Z", coloque somente Z em a do relacionamento X-Y. X nunca é atributo e não pode ficar isolada.',
    );
  }

  if (serializedError.includes('Atributos compostos devem possuir componentes')) {
    corrections.push(
      '- Para cada atributo composto, array c não vazio exige a flag "c" em f e flag "c" em f exige array c não vazio com as partes informadas no texto.',
      '- Componentes ficam somente dentro de c do atributo pai; remova duplicações em a. Preserve "m" apenas se o atributo inteiro for repetível; "c" e "m" podem coexistir.',
    );
  }

  corrections.push('- Preserve todos os elementos não envolvidos nos erros acima.');
  return corrections.join('\n');
}
