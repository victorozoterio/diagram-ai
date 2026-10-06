export function buildAmbiguityAnalysisPrompt(description: string): string {
  return `
Analise a descrição de um sistema antes da modelagem.

DESCRIÇÃO:
${description}

Identifique somente ambiguidades que podem mudar estruturalmente o modelo de dados: entidades, atributos versus entidades, relacionamentos, cardinalidades, atributos compostos, generalização ou decisões equivalentes.
- Ambiguidade também inclui uma informação estrutural necessária que está AUSENTE. Não é necessário haver contradição no texto: uma relação explícita cuja cardinalidade não esteja totalmente definida possui múltiplas interpretações compatíveis e deve gerar pergunta.
- Antes de responder, liste mentalmente TODAS as relações explícitas do texto. Para cada par de participantes, determine a multiplicidade de A para B e de B para A. Não pare após encontrar a primeira ambiguidade.
- Só use requiresClarification=false quando não houver nenhuma relação estrutural pendente. Para cada relação explícita sem cardinalidade totalmente definida, gere uma pergunta própria, até o limite de 5.
- Para cardinalidade, avalie A para B e B para A antes de decidir. "Um A pode ter vários B" define uma direção; o artigo "um" sozinho não define a outra. Se as duas direções estiverem explícitas, a cardinalidade está resolvida e é proibido perguntar novamente sobre ela.
- Se uma direção estiver indefinida, faça uma única pergunta com as opções 1:1, 1:N, N:1 e N:N, allowsMultipleSelection=false e allowsCustomAnswer=true.
- Para perguntas de cardinalidade, use obrigatoriamente kind="cardinality" e participants com exatamente os dois nomes de entidade na mesma ordem usada como A e B nas quatro opções. Para as demais dúvidas estruturais, use kind="structural" e omita participants.
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
Saída: {"requiresClarification":true,"questions":[{"id":"cardinalidade_autores_livros","kind":"cardinality","participants":["autor","livro"],"text":"Como autores e livros participam dessa relação?","options":["Cada autor escreve um livro, e cada livro é escrito por um autor (1:1)","Um autor pode escrever vários livros, e cada livro é escrito por um autor (1:N)","Cada autor escreve um livro, e um livro pode ser escrito por vários autores (N:1)","Um autor pode escrever vários livros, e um livro pode ser escrito por vários autores (N:N)"],"allowsMultipleSelection":false,"allowsCustomAnswer":true}]}

AMBÍGUO
Descrição: "Pesquisadores participam de estudos. Estudos pertencem a programas."
Saída: {"requiresClarification":true,"questions":[{"id":"cardinalidade_pesquisadores_estudos","kind":"cardinality","participants":["pesquisador","estudo"],"text":"Como pesquisadores e estudos participam dessa relação?","options":["Cada pesquisador participa de um estudo, e cada estudo possui um pesquisador (1:1)","Um pesquisador pode participar de vários estudos, e cada estudo possui um pesquisador (1:N)","Cada pesquisador participa de um estudo, e um estudo pode possuir vários pesquisadores (N:1)","Um pesquisador pode participar de vários estudos, e um estudo pode possuir vários pesquisadores (N:N)"],"allowsMultipleSelection":false,"allowsCustomAnswer":true},{"id":"cardinalidade_estudos_programas","kind":"cardinality","participants":["estudo","programa"],"text":"Como estudos e programas se relacionam?","options":["Cada estudo pertence a um programa, e cada programa possui um estudo (1:1)","Um estudo pode pertencer a vários programas, e cada programa possui um estudo (1:N)","Cada estudo pertence a um programa, e um programa pode possuir vários estudos (N:1)","Um estudo pode pertencer a vários programas, e um programa pode possuir vários estudos (N:N)"],"allowsMultipleSelection":false,"allowsCustomAnswer":true}]}

NÃO AMBÍGUO
Descrição: "Um médico pode atender vários pacientes e um paciente pode ser atendido por vários médicos."
Saída: {"requiresClarification":false,"questions":[]}

NÃO AMBÍGUO
Descrição: "Um A possui vários B e cada B pertence a apenas um A."
Saída: {"requiresClarification":false,"questions":[]}

Os exemplos demonstram a regra geral; aplique-a a quaisquer entidades e relacionamentos descritos.
- Retorne somente JSON compatível com o schema enviado.
`.trim();
}
