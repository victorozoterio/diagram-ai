export function buildAmbiguityAnalysisPrompt(description: string): string {
  return `
Analise a descrição de um sistema antes da modelagem.

DESCRIÇÃO:
${description}

Identifique somente ambiguidades que podem mudar estruturalmente o modelo de dados: entidades, atributos versus entidades, relacionamentos, cardinalidades, atributos compostos, generalização ou decisões equivalentes.
- Faça uma pergunta somente se existirem duas ou mais interpretações estruturais compatíveis com o texto. Não pergunte detalhes triviais nem proponha regras de domínio fora dele.
- Antes de responder, faça uma varredura completa de TODAS as relações explícitas do texto. Avalie cada par de participantes independentemente; não pare após encontrar a primeira ambiguidade. Para cada relação sem cardinalidade totalmente definida, gere uma pergunta própria, até o limite de 5.
- Para cardinalidade, avalie A para B e B para A antes de decidir. "Um A pode ter vários B" define uma direção; o artigo "um" sozinho não define a outra. Se as duas direções estiverem explícitas, não há pergunta de cardinalidade.
- Se uma direção estiver indefinida, faça uma única pergunta com as opções 1:1, 1:N, N:1 e N:N, allowsMultipleSelection=false e allowsCustomAnswer=true.
- Para perguntas de cardinalidade, use obrigatoriamente kind="cardinality". Para as demais dúvidas estruturais, use kind="structural".
- Nas quatro opções de cardinalidade, o texto e o rótulo entre parênteses devem corresponder exatamente a esta semântica, usando A e B como os participantes da relação:
  - (1:1): cada A se relaciona com um B, e cada B se relaciona com um A.
  - (1:N): um A pode se relacionar com vários B, e cada B se relaciona com um A.
  - (N:1): cada A se relaciona com um B, e um B pode se relacionar com vários A.
  - (N:N): um A pode se relacionar com vários B, e um B pode se relacionar com vários A.
- Nunca rotule como (N:1) ou (1:N) uma opção que descreva multiplicidade de vários nos dois sentidos; essa descrição é obrigatoriamente (N:N).
- Escreva perguntas e opções em português natural, reutilizando o verbo ou contexto do texto. Apresente a cardinalidade apenas como complemento entre parênteses.
- Faça no máximo 5 perguntas. Sem ambiguidade estrutural relevante, use requiresClarification=false e questions=[].

EXEMPLOS:

AMBÍGUO
Descrição: "Autores escrevem livros."
Saída: {"requiresClarification":true,"questions":[{"id":"cardinalidade_autores_livros","kind":"cardinality","text":"Como autores e livros participam dessa relação?","options":["Cada autor escreve um livro, e cada livro é escrito por um autor (1:1)","Um autor pode escrever vários livros, e cada livro é escrito por um autor (1:N)","Cada autor escreve um livro, e um livro pode ser escrito por vários autores (N:1)","Um autor pode escrever vários livros, e um livro pode ser escrito por vários autores (N:N)"],"allowsMultipleSelection":false,"allowsCustomAnswer":true}]}

NÃO AMBÍGUO
Descrição: "Um médico pode atender vários pacientes e um paciente pode ser atendido por vários médicos."
Saída: {"requiresClarification":false,"questions":[]}

Os exemplos demonstram a regra geral; aplique-a a quaisquer entidades e relacionamentos descritos.
- Retorne somente JSON compatível com o schema enviado.
`.trim();
}
