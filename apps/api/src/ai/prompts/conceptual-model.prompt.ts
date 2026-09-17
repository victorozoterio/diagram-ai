type BuildConceptualModelPromptInput = {
  description: string;
};

export function buildConceptualModelPrompt({ description }: BuildConceptualModelPromptInput): string {
  return `
Converta a descrição em um DER Chen conceitual.

DESCRIÇÃO:
${description}

REGRAS:
- Extraia primeiro, internamente, todas as entidades, atributos, relacionamentos e cardinalidades explícitos. Não omita nenhum deles.
- Todo sujeito que possui, vende, cadastra ou se relaciona explicitamente com outros conceitos também é entidade, mesmo sem atributos próprios informados.
- Uma entidade sem atributos explícitos continua na saída com apenas n; omita a nesse caso. Nunca trate o sujeito inicial como mero contexto do sistema.
- Regra absoluta: um sujeito explícito de relação não pode ser omitido nem descartado em ambiguities por não possuir atributos informados.
- O backend adiciona o identificador técnico de cada entidade; não o repita. Use i em outro atributo somente se o texto disser que ele identifica a entidade ou é sua chave; aparência de unicidade não basta.
- Não gere foreign keys, tabelas associativas nem entidades artificiais de ligação. Um N:N permanece relacionamento.
- Dados cujo valor depende da ocorrência ou do par específico entre participantes pertencem ao relacionamento, em r[].a.
- Só crie atributos no relacionamento quando o texto os vincular à ocorrência da associação. Atributos declarados como pertencentes a uma entidade ficam somente nela; nunca os copie para o relacionamento.
- Nunca use atributos terminados em "_id" em entidades ou relacionamentos.
- Um conceito dependente que apenas agrupa campos descritivos, sem identificador próprio, eventos ou relações com terceiros, deve ser atributo composto. Composite e multivalued são independentes: vários componentes não implicam m; use m somente quando o texto indicar múltiplos valores ou ocorrências do atributo inteiro.
- Atributo composto exige simultaneamente f contendo c e c com ao menos um componente; atributos não compostos omitem c. Liste os componentes somente em c.
- Uma frase de posse, sozinha, não transforma um valor composto em entidade. Não duplique esse conceito como atributo e entidade.
- Use entidade quando o conceito tiver identidade, ciclo de vida, atributos de evento próprios ou participação explícita em relacionamento. Menções posteriores com atributos próprios não podem desaparecer nem virar apenas um atributo textual de outra entidade.
- Preserve o substantivo explícito que recebe atributos e relações. Não o renomeie a partir de outra expressão do texto e não crie nomes combinando proprietário e conceito dependente.
- Atributos usam nomes do conceito, sem prefixo da entidade. Relacionamentos usam verbos.
- Use snake_case em nomes com mais de uma palavra, preservando cada conceito separado por "_".
- Frases inversas sobre o mesmo fato representam um único relacionamento; não gere um losango para cada direção da frase.
- Infira atributos de domínio somente quando forem plausíveis e úteis; não use listas fixas nem substitua fatos explícitos.
- Cardinalidades dos participantes: 1:1 = 1 e 1; 1:N = um 1 e um N; N:N = N e N.
- Generalização/especialização não é relacionamento binário: use k="generalization" ou k="specialization", s para o nome do único supertipo e d para a lista de um ou mais subtipos; nesse caso omita p e não use cardinalidades.
- Uma entidade relacionada no texto não pode ficar isolada. Registre incertezas reais em ambiguities.

CLASSIFICAÇÃO INTERNA:
1. Sujeito que pratica uma relação, inclusive sem atributos informados: entidade.
2. Conceito com atributos de evento e vínculo próprio: entidade.
3. Grupo de campos descritivos ligado somente ao proprietário: atributo com f=["c"] e seus campos em c; acrescente m somente se o grupo inteiro for explicitamente repetível.
4. Dados que existem por ocorrência entre duas entidades: atributos do relacionamento correspondente.

Exemplo abstrato: "X contém A, B e C" gera X com f=["c"] e componentes em c, sem m.

SAÍDA COMPACTA:
- Retorne apenas os campos aceitos pelo JSON Schema enviado em format.
- Chaves: raiz e=entidades, r=relacionamentos, q=ambiguidades; entidade n=nome e a=atributos; atributo n=nome, t=tipo, f=flags e c=componentes; relacionamento n=nome, k=tipo, p=participantes, a=atributos, s=supertipo e d=subtipos; participante e=entidade e c=cardinalidade.
- Tipos: s=string, n=number, b=boolean, d=date, dt=datetime, t=text, dec=decimal, u=uuid, e=email, p=phone, x=unknown.
- Flags: i=identifier, r=required, u=unique, m=multivalued, c=composite, d=derived.
- Não gere ids internos de objetos, metadata ou descriptions; o backend os adiciona.
- Em flags, inclua somente propriedades verdadeiras.
- Em cada participante, use exatamente o nome de uma entidade gerada.
- Omita arrays opcionais vazios.

Antes de responder, confira internamente: cobertura dos fatos, entidades isoladas, N:N, posse dos atributos, duplicações, cardinalidades e ausência de estruturas lógicas. Retorne somente JSON.
`.trim();
}
