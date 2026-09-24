type BuildLogicalModelPromptInput = {
  description: string;
};

export function buildLogicalModelPrompt({ description }: BuildLogicalModelPromptInput): string {
  return `
Converta a descrição em um modelo lógico relacional diretamente.

DESCRIÇÃO:
${description}

REGRAS:
- Retorne somente tabelas e colunas; não gere entidades, losangos, cardinalidades ou estruturas de DER Chen.
- Use nomes em snake_case e minúsculos para tabelas e colunas.
- Toda tabela independente deve ter uma PK técnica uuid chamada id_<tabela>, salvo subtipos de generalização.
- REGRA OBRIGATÓRIA PARA 1:N: toda relação explícita precisa aparecer como uma FK na tabela do lado N, com foreignKey=true e references para a PK da tabela do lado 1. Nunca deixe tabelas sem conexão quando o texto informa uma relação. Exemplo estrutural: <lado_1> 1:N <lado_n> gera <lado_n>.id_<lado_1> referenciando <lado_1>.id_<lado_1>.
- Preencha oneToMany com cada relação 1:N usando os nomes das tabelas em oneTable e manyTable. Essa diretiva técnica garante a mesma criação de FK usada pelo conversor; ela não faz parte do modelo exibido.
- Para 1:1, escolha a tabela que recebe a FK e preencha oneToOne com referencedTable e targetTable; somente essa FK estrutural será UNIQUE.
- Para N:N, crie uma tabela associativa chamada <tabela_origem>_<tabela_destino>, com id_<tabela_origem> e id_<tabela_destino> como PK composta e FKs; atributos da associação ficam nela. Não crie PK artificial nessa tabela.
- Preencha manyToMany com cada relação N:N usando firstTable, secondTable e associationTable. Essa diretiva técnica garante a PK composta e remove PKs artificiais da tabela associativa.
- Atributos compostos viram suas colunas componentes na mesma tabela. Atributos multivalorados viram tabela própria com FK para a tabela proprietária.
- Generalização/especialização usa table-per-type: o supertipo mantém sua PK; cada subtipo não possui PK própria e recebe <supertipo>_id como PK e FK para a PK do supertipo, além de seus atributos específicos.
- FK exige references com a tabela e a coluna efetivamente referenciadas. PKs e FKs estruturais são obrigatórias (nullable=false). PK não deve receber unique=true só por ser PK; em 1:1, somente a FK também é unique=true.
- Para colunas comuns, nullable=true e unique=false são o padrão. Não inclua nullable ou unique em columns.
- Declare constraints explícitas somente em constraints.unique ou constraints.notNull, com table, column e evidence contendo um trecho literal da descrição que prove a unicidade ou obrigatoriedade. Sem evidência textual explícita, deixe os arrays vazios; nunca infira UNIQUE/NOT NULL por semântica de CPF, email, título, status ou qualquer outro nome.
- Use tipos somente entre uuid, varchar, text, integer, bigint, decimal, boolean, date, datetime ou timestamp.
- Preserve fatos explícitos e não invente tabelas ou FKs sem relação semântica.
- Antes de responder, confira que cada relação 1:N, 1:1 ou N:N identificada na descrição possui sua FK/references correspondente nas tabelas retornadas.

SAÍDA:
Retorne somente JSON aceito pelo schema: {"tables":[{"name":"...","columns":[{"name":"...","type":"...","primaryKey":true,"foreignKey":true,"references":{"table":"...","column":"..."}}]}],"oneToMany":[{"oneTable":"...","manyTable":"..."}],"oneToOne":[{"referencedTable":"...","targetTable":"..."}],"manyToMany":[{"firstTable":"...","secondTable":"...","associationTable":"..."}],"constraints":{"unique":[{"table":"...","column":"...","evidence":"..."}],"notNull":[{"table":"...","column":"...","evidence":"..."}]}}.
Omita flags falsas e omita references quando a coluna não for FK. Use arrays vazios quando não houver constraints explícitas. Não gere ids internos: o backend os cria.
`.trim();
}
