import type { ClarificationAnswer } from '../ambiguity-analysis.schema';
import { formatClarifications } from './clarifications.prompt';

type BuildConceptualModelPromptInput = {
  description: string;
  clarifications?: ClarificationAnswer[];
};

export function buildConceptualModelPrompt({ description, clarifications }: BuildConceptualModelPromptInput): string {
  return `
Converta a descrição em um DER Chen conceitual.

DESCRIÇÃO:
${description}
${formatClarifications(clarifications)}

REGRAS:
- Extraia primeiro, internamente, todas as entidades, atributos, relacionamentos e cardinalidades explícitos. Não omita nenhum deles.
- Todo sujeito que possui, vende, cadastra ou se relaciona explicitamente com outros conceitos também é entidade, mesmo sem atributos próprios informados.
- Depois que um conceito for reconhecido como entidade, menções posteriores no singular ou plural continuam sendo essa entidade e devem aparecer como participantes de seus relacionamentos; nunca o duplique como atributo simples ou multivalorado.
- Uma entidade sem atributos explícitos continua na saída com apenas n; omita a nesse caso. Nunca trate o sujeito inicial como mero contexto do sistema.
- Regra absoluta: um sujeito explícito de relação não pode ser omitido nem descartado em ambiguities por não possuir atributos informados.
- O backend adiciona o identificador técnico de cada entidade; não o repita. Use i em outro atributo somente se o texto disser que ele identifica a entidade ou é sua chave; aparência de unicidade não basta.
- Não gere foreign keys, tabelas associativas nem entidades artificiais de ligação. Um N:N permanece relacionamento.
- Dados cujo valor depende da ocorrência ou do par específico entre participantes pertencem ao relacionamento, em r[].a.
- Em frases como "para cada X associado ou incluído em Y, armazenar Z", crie ou reutilize o relacionamento entre as entidades X e Y e coloque somente Z em seus atributos.
- Quando Y possui vários X e o mesmo X pode aparecer em vários Y, a cardinalidade é N:N: ambos os participantes usam c="N".
- Só crie atributos no relacionamento quando o texto os vincular à ocorrência da associação. Atributos declarados como pertencentes a uma entidade ficam somente nela; nunca os copie para o relacionamento.
- Nunca use atributos terminados em "_id" em entidades ou relacionamentos.
- Um conceito dependente que apenas agrupa campos descritivos, sem identificador próprio, eventos ou relações com terceiros, deve ser atributo composto. Composite e multivalued são independentes e podem coexistir: vários componentes não implicam m; use m somente quando o texto indicar múltiplos valores ou ocorrências do atributo inteiro.
- Multiplicidade entre dois conceitos participantes altera a cardinalidade do relacionamento; não transforma uma entidade participante em atributo multivalorado.
- No formato compacto, composite=true é representado pela flag "c" em f. A regra é bidirecional e obrigatória: array c presente e não vazio exige "c" em f; "c" em f exige array c presente e não vazio.
- Componentes aparecem somente dentro do array c do atributo pai; não os repita como atributos independentes em a da entidade.
- Uma frase de posse, sozinha, não transforma um valor composto em entidade. Não duplique esse conceito como atributo e entidade.
- Use entidade quando o conceito tiver identidade, ciclo de vida, atributos de evento próprios ou participação explícita em relacionamento. Menções posteriores com atributos próprios não podem desaparecer nem virar apenas um atributo textual de outra entidade.
- Preserve o substantivo explícito que recebe atributos e relações. Não o renomeie a partir de outra expressão do texto e não crie nomes combinando proprietário e conceito dependente.
- Atributos usam nomes do conceito, sem prefixo da entidade. Relacionamentos usam verbos.
- Use snake_case em nomes com mais de uma palavra, preservando cada conceito separado por "_".
- Frases inversas sobre o mesmo fato representam um único relacionamento; não gere um losango para cada direção da frase.
- Infira atributos de domínio somente quando forem plausíveis e úteis; não use listas fixas nem substitua fatos explícitos.
- Cardinalidades dos participantes: 1:1 = 1 e 1; 1:N = um 1 e um N; N:N = N e N.
- Generalização/especialização não é relacionamento binário: use k="generalization" ou k="specialization", s para o nome do único supertipo e d para a lista de um ou mais subtipos; nesse caso omita p e não use cardinalidades. Cada classificação de um mesmo supertipo gera um único item em r: agrupe todos os seus subtipos em d; nunca crie um Gen por subtipo e nunca omita s.
- Os formatos são exclusivos: relacionamento comum usa p e nunca usa s/d; generalização usa s/d e nunca usa p. Nunca adicione k="generalization" a uma associação expressa por verbo.
- Reconheça generalização somente quando houver evidência semântica de identidade de categoria: "é um", "tipo de", "categoria de", "especialização" ou divisão explícita de um conceito em tipos. A palavra "pode" isolada não basta: "X pode realizar, possuir, conter ou participar de Y" descreve associação, não generalização. Não a infira apenas por atributos semelhantes.
- Em uma hierarquia, coloque atributos comuns somente no supertipo e atributos específicos somente nos subtipos; não duplique atributos entre eles.
- Uma entidade relacionada no texto não pode ficar isolada. Registre incertezas reais em ambiguities.

CLASSIFICAÇÃO INTERNA:
1. Sujeito que pratica uma relação, inclusive sem atributos informados: entidade.
2. Conceito com atributos de evento e vínculo próprio: entidade.
3. Grupo de campos descritivos ligado somente ao proprietário: atributo com f=["c"] e seus campos em c; acrescente m somente se o grupo inteiro for explicitamente repetível.
4. Conceito já classificado como entidade que aparece associado, incluído ou contido em outra entidade: participante de relacionamento, com cardinalidade adequada.
5. Dados que existem por ocorrência entre duas entidades: atributos do relacionamento correspondente.

Exemplo estrutural de composição: {"n":"A","t":"s","f":["c"],"c":[{"n":"B","t":"s"},{"n":"C","t":"s"}]}. Se A também for repetível, use f=["c","m"].

Exemplo estrutural de associação: "Y contém vários X; o mesmo X aparece em vários Y; para cada X em Y armazene Z" gera {"n":"contem","p":[{"e":"Y","c":"N"},{"e":"X","c":"N"}],"a":[{"n":"Z","t":"x"}]}.

EXEMPLO CURTO DE HIERARQUIA:
Descrição: "Contrato e nota fiscal são tipos de documento. Documento possui número; contrato possui prazo; nota fiscal possui série."
Saída relevante: {"e":[{"n":"Documento","a":[{"n":"numero","t":"s"}]},{"n":"Contrato","a":[{"n":"prazo","t":"d"}]},{"n":"Nota Fiscal","a":[{"n":"serie","t":"s"}]}],"r":[{"n":"Gen","k":"generalization","s":"Documento","d":["Contrato","Nota Fiscal"]}]}

CHECKLIST SEMÂNTICO:
- Se o texto afirmar que um conceito "é um/tipo de" outro, é generalização; verbos de ação, posse, conteúdo ou participação entre conceitos representam relacionamento.
- Uma generalização deve ter exatamente um s e pelo menos um d, sem p nem cardinalidade; subtipos do mesmo s ficam juntos no mesmo item.
- Não crie generalização sem evidência textual suficiente; mantenha relacionamentos normais e seus atributos quando a semântica for de associação.
- Para cada nome em e, confirme que nenhuma forma singular ou plural desse nome aparece em a; se o texto relacionar essa entidade, represente-a em p do relacionamento correto.

SAÍDA COMPACTA:
- Retorne apenas os campos aceitos pelo JSON Schema enviado em format.
- Chaves: raiz e=entidades, r=relacionamentos, q=ambiguidades; entidade n=nome e a=atributos; atributo n=nome, t=tipo, f=flags e c=componentes; relacionamento n=nome, k=tipo, p=participantes, a=atributos, s=supertipo e d=subtipos; participante e=entidade e c=cardinalidade.
- Tipos: s=string, n=number, b=boolean, d=date, dt=datetime, t=text, dec=decimal, u=uuid, e=email, p=phone, x=unknown.
- Flags: i=identifier, r=required, u=unique, m=multivalued, c=composite, d=derived.
- Não gere ids internos de objetos, metadata ou descriptions; o backend os adiciona.
- Em flags, inclua somente propriedades verdadeiras.
- Em cada participante, use exatamente o nome de uma entidade gerada.
- Omita arrays opcionais vazios.

Antes de responder, confira internamente: cobertura dos fatos, entidades isoladas, N:N, posse dos atributos, nenhuma entidade repetida como atributo, duplicações, cardinalidades e ausência de estruturas lógicas. Retorne somente JSON.
`.trim();
}
