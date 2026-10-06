import type { ConceptualModelRepairContext } from '../../../diagrams/services/conceptual-model-repair-context';
import type { ClarificationAnswer } from '../../ambiguity-analysis.schema';
import { formatClarifications } from '../../prompts/clarifications.prompt';

export function buildFixConceptualModelPrompt(params: {
  description: string;
  invalidModel: unknown;
  validationError: unknown;
  clarifications?: ClarificationAnswer[];
}): string {
  const targetedCorrections = buildTargetedCorrections(params.validationError);

  return `
Corrija o modelo conceitual preservando tudo que já está correto.

DESCRIÇÃO ORIGINAL:
${params.description}
${formatClarifications(params.clarifications)}

MODELO INVÁLIDO:
${JSON.stringify(params.invalidModel)}

ERROS DE VALIDAÇÃO:
${JSON.stringify(params.validationError)}

CORREÇÃO PRIORITÁRIA DOS ERROS:
${targetedCorrections}

Use DER Chen: o backend adiciona identificadores técnicos; use i fora deles somente quando a descrição disser que o atributo identifica a entidade ou é sua chave; unicidade potencial, CPF, email, código ou matrícula não bastam; nenhuma foreign key; N:N como relacionamento; um conceito já reconhecido como entidade permanece entidade em menções posteriores no singular ou plural e participa dos relacionamentos, nunca vira atributo; "para cada X associado/incluído em Y, armazenar Z" coloca somente Z em a do relacionamento X-Y; dados que dependem do par ficam em a do relacionamento. O nome de uma ocorrência de associação não vira entidade quando aparece apenas para informar dado dessa associação: reutilize r e mantenha esse dado em a; só crie entidade de evento se o texto lhe der identidade própria, ciclo de vida ou relações independentes. Se um fato da associação tiver o mesmo rótulo genérico de um fato de uma entidade, preserve os dois e dê ao atributo do relacionamento um nome contextual que diferencie o fato da associação; só remova-o se realmente repetir o mesmo fato. Atributo composto exige f com c e componentes não vazios em c; c não implica m, que exige multiplicidade explícita; multiplicidade entre entidades altera cardinalidade e não cria atributo multivalorado; atributos da entidade ficam somente nela; cardinalidades fiéis ao texto. Generalização/especialização usa k, s para um supertipo e d para um ou mais subtipos, sem p ou cardinalidades; só use-a quando o texto afirmar relação de "é um", "tipo de", "categoria" ou especialização. "Pode realizar, possuir, conter ou participar" indica associação, não generalização. Mantenha atributos comuns no supertipo e específicos nos subtipos sem duplicação. Para o mesmo supertipo e a mesma classificação, gere um único item de generalização e reúna todos os subtipos em d; nunca gere um Gen por subtipo nem um Gen sem s. Se um Gen inválido não tiver supertipo e o texto não trouxer hierarquia explícita, corrija-o para relacionamento comum em vez de inventar s. Una frases inversas que descrevam o mesmo relacionamento. Preserve todas as entidades e relações explícitas e não deixe isolada uma entidade relacionada no texto.

Retorne somente o JSON compacto aceito pelo schema, usando as mesmas chaves e códigos da entrada inválida. Não gere ids internos, metadata ou descriptions; use flags apenas para valores verdadeiros e omita arrays opcionais vazios.
`.trim();
}

function buildTargetedCorrections(validationError: unknown): string {
  const serializedError = JSON.stringify(validationError);
  const corrections: string[] = [];
  const repairContext = readRepairContext(validationError);

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

  for (const conflict of repairContext.compositeAttributes) {
    const components = JSON.stringify(conflict.attribute.components);
    corrections.push(
      `- O atributo "${conflict.attribute.name}" (id "${conflict.attribute.id}") em ${conflict.scope} "${conflict.owner}" viola a composição: composite=${conflict.attribute.composite}, components=${components}, multivalued=${conflict.attribute.multivalued}.`,
      '- A regra é obrigatória: use a flag "c" em f somente se existir array c não vazio com componentes válidos. Se nenhum componente foi fornecido, remova a flag "c" e mantenha o atributo simples; nunca invente componentes por causa do nome do atributo.',
    );
  }

  if (serializedError.includes('Generalização exige evidência explícita de supertipo e subtipo')) {
    corrections.push(
      '- O item Gen não possui evidência explícita de relação de tipo/categoria na descrição. Preserve os participantes explícitos da descrição e substitua esse Gen por um relacionamento comum com p e as cardinalidades confirmadas pelo usuário.',
      '- Remova qualquer entidade artificial formada apenas pelo verbo ou pela expressão da associação; o verbo nomeia o relacionamento, não uma entidade ou subtipo.',
      '- Uma resposta de cardinalidade para uma associação nunca autoriza criar supertipo, subtipo ou uma entidade formada a partir do verbo da associação.',
    );
  }

  if (repairContext.duplicateRelationshipAttributes.length > 0) {
    corrections.push(
      ...repairContext.duplicateRelationshipAttributes.flatMap((conflict) => {
        const participantAttributes = conflict.participantAttributes
          .map(({ entity, attribute }) => `${entity}.${attribute}`)
          .join(', ');

        return [
          `- No relacionamento "${conflict.relationship}", o atributo "${conflict.relationshipAttribute}" conflita com ${participantAttributes || 'um atributo de entidade participante'}.`,
          '- Compare o fato descrito para a entidade com o fato descrito para a ocorrência da associação. Se forem fatos distintos, preserve ambos e renomeie somente o atributo do relacionamento com um contexto semântico da associação; se forem o mesmo fato, mantenha-o apenas na entidade e remova a cópia do relacionamento.',
        ];
      }),
    );
  }

  if (
    validationError &&
    typeof validationError === 'object' &&
    'unsupportedRelationshipAttributes' in validationError
  ) {
    const unsupported = validationError.unsupportedRelationshipAttributes;
    if (Array.isArray(unsupported)) {
      for (const item of unsupported) {
        if (!item || typeof item !== 'object' || !('relationship' in item) || !('attribute' in item)) continue;
        corrections.push(
          `- O atributo "${String(item.attribute)}" em "${String(item.relationship)}" não tem evidência nessa associação. Remova-o desse relacionamento; preserve-o somente na entidade ou na outra relação à qual a descrição o atribui explicitamente.`,
        );
      }
    }
  }

  if (validationError && typeof validationError === 'object' && 'misplacedEntityAttributes' in validationError) {
    const misplaced = validationError.misplacedEntityAttributes;
    if (Array.isArray(misplaced)) {
      for (const item of misplaced) {
        if (!item || typeof item !== 'object' || !('entity' in item) || !('attribute' in item)) continue;
        if ('reason' in item && item.reason === 'entity-used-as-attribute') {
          corrections.push(
            `- Remova o atributo "${String(item.attribute)}" de e[].a da entidade "${String(item.entity)}": esse conceito já é uma entidade ligada por "${String(item.relationship)}". Preserve as duas entidades e o relacionamento em r[].`,
          );
        } else if ('reason' in item && item.reason === 'association-attribute-in-entity') {
          corrections.push(
            `- Mova "${String(item.attribute)}" de e[].a da entidade "${String(item.entity)}" para r[].a do relacionamento "${String(item.relationship)}" entre ${JSON.stringify(item.participants)}. Evidência textual: ${String(item.evidence)}. Se r[].a já descrever o mesmo fato, mantenha uma única cópia na associação. Preserve os atributos próprios da entidade.`,
          );
        }
      }
    }
  }

  corrections.push('- Preserve todos os elementos não envolvidos nos erros acima.');
  return corrections.join('\n');
}

function readRepairContext(validationError: unknown): ConceptualModelRepairContext {
  if (!validationError || typeof validationError !== 'object' || !('repair' in validationError)) {
    return { duplicateRelationshipAttributes: [], compositeAttributes: [] };
  }

  const repair = validationError.repair;
  if (!repair || typeof repair !== 'object') {
    return { duplicateRelationshipAttributes: [], compositeAttributes: [] };
  }

  const duplicateRelationshipAttributes =
    'duplicateRelationshipAttributes' in repair ? repair.duplicateRelationshipAttributes : undefined;
  const compositeAttributes = 'compositeAttributes' in repair ? repair.compositeAttributes : undefined;
  return {
    duplicateRelationshipAttributes: Array.isArray(duplicateRelationshipAttributes)
      ? (duplicateRelationshipAttributes as ConceptualModelRepairContext['duplicateRelationshipAttributes'])
      : [],
    compositeAttributes: Array.isArray(compositeAttributes)
      ? (compositeAttributes as ConceptualModelRepairContext['compositeAttributes'])
      : [],
  };
}
