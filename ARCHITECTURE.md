# Arquitetura do Diagram.AI

Este documento descreve a organização interna do código. Para instalação,
configuração e uso da aplicação, consulte o [README.md](README.md).

## Visão geral

Este é um monorepo pnpm com duas aplicações:

- `apps/web`: SPA React/TypeScript para autenticação e edição visual.
- `apps/api`: API NestJS para autenticação, persistência, geração,
  conversões, SQL e transcrição.

O navegador mantém o estado de trabalho do editor. A API recebe modelos e
descrições, valida contratos e centraliza integrações com PostgreSQL, Ollama e
whisper.cpp.

## Frontend (`apps/web`)

### Organização

- `src/api`: cliente HTTP dos endpoints de diagramas.
- `src/auth`: cliente React do Better Auth e consulta dos providers sociais.
- `src/routes`: constantes de rota e roteador. `Router.tsx` controla sessão,
  carregamento de projeto e bloqueio de saída com alterações não salvas.
- `src/features/auth`: login/cadastro e schemas Zod usados pelo React Hook
  Form.
- `src/features/diagrams`: domínio e interface do editor.
- `src/styles`: estilos globais; estilos específicos ficam ao lado do
  componente em CSS Modules.

### Editor e React Flow

`useDiagramEditor` é o contrato central do estado do editor. Ele mantém os
modelos conceitual e lógico separadamente, dados visuais, seleção e histórico
de undo/redo. Os hooks em `features/diagrams/hooks/editor` dividem ações por
ciclo de vida, entidades, atributos, relacionamentos, conexões e biblioteca.

`useDiagramLifecycle` orquestra geração, conversão e auto-layout inicial.
Componentes de apresentação não devem conter regras de modelagem ou chamadas
HTTP.

Os canvases são adaptadores de React Flow:

- `ConceptualDiagramFlow` renderiza a notação Chen, nodes, edges, handles e a
  connection line customizada.
- `LogicalModelFlow` renderiza tabelas e edges ortogonais do modelo lógico.
- `flow-mappers` converte estado de domínio em nodes e edges sem alterar o
  estado do editor.
- `nodes`, `edges` e seus estilos são isolados por tipo visual.

O tipo versionado `DiagramAiProject` (`diagram-ai`, versão `1`) reúne modelo
semântico e estado visual serializável. Ele é usado tanto em arquivos
`.diagramai` quanto na persistência remota.

## Backend (`apps/api`)

### Módulos NestJS

- `config`: validação de ambiente com Zod e Swagger.
- `prisma`: `PrismaService`, Prisma Client com adapter PostgreSQL e ciclo de
  conexão do NestJS.
- `auth`: Better Auth, handler nativo em `/api/auth`, sessão por cookie,
  `SessionAuthGuard` e `CurrentUser`.
- `ai`: prompts, schema de ambiguidades, `AiService` e provider Ollama.
- `speech`: abstração `SpeechToTextProvider`, serviço e implementação
  whisper.cpp.
- `diagrams`: controllers, DTOs, schemas e serviços do domínio.

`DiagramsController` exige sessão válida para todas as operações de
diagramas. `DiagramProjectsController` obtém o usuário atual pela sessão; o
`userId` não é aceito do cliente para definir propriedade. As operações de
projetos filtram por esse usuário e preservam ownership.

### Modelos e persistência

Os schemas Zod em `diagrams/schemas` são os contratos de modelos conceitual e
lógico. DTOs validam entrada HTTP; os schemas validam modelos recebidos,
gerados ou convertidos antes de operações de domínio.

Prisma mapeia `User`, `Account`, `Session` e `Verification` do Better Auth,
além de `Diagram`. Cada `Diagram` pertence a um `User` e armazena `content` em
JSONB. O conteúdo é o mesmo `DiagramAiProject` versionado usado pelo
frontend, evitando uma segunda representação de projeto salvo.

`DiagramProjectsService` concentra criação, listagem, leitura, atualização e
remoção. Ele valida o envelope `diagram-ai` antes de persistir e aplica
ownership em todas as operações.

## Geração, validação e reparo

O fluxo de IA é separado das transformações determinísticas:

1. `DiagramsService` recebe descrição e esclarecimentos opcionais.
2. `AiService` delega ao `OllamaProvider`, que usa prompts distintos para
   modelo conceitual, lógico, reparo e análise de ambiguidades.
3. A resposta é normalizada quando necessário e validada pelo schema Zod
   correspondente.
4. Se inválida, o serviço envia o candidato anterior e erros estruturados
   para reparo; há no máximo duas tentativas por geração.
5. Um modelo ainda inválido resulta em erro controlado.

`analyze-ambiguities` também usa Ollama, mas seu contrato é limitado a
perguntas estruturais. As respostas do usuário retornam como esclarecimentos
na geração posterior.

## Operações determinísticas

Estas operações não usam IA:

- `LogicalModelConverterService`: conceitual (Chen) para lógico.
- `LogicalToConceptualConverterService`: lógico para conceitual quando a
  estrutura permite reconstrução segura.
- `SqlGeneratorService`: SQL para PostgreSQL, MySQL, MariaDB e SQL Server a
  partir do modelo lógico validado.

Esses serviços recebem modelos já validados. Regras de PK/FK, tabelas
associativas, generalização e constraints pertencem aos
conversores/normalizadores, não aos controllers nem ao frontend.

## Serviços externos

### Ollama

`OllamaProvider` é o ponto de integração da geração por IA. Não participa de
conversões, SQL, persistência ou renderização do canvas.

### Transcrição por voz

O frontend captura áudio com `MediaRecorder` e o envia à API.
`SpeechToTextService` valida tamanho e tipo do upload; o
`WhisperSpeechToTextProvider` converte o áudio com FFmpeg e executa
whisper.cpp com idioma configurável. O resultado preenche o textarea, sem
gerar modelo automaticamente e sem passar pelo Ollama.

## Decisões arquiteturais

- **Modelo e visual separados no mesmo artefato:** o projeto restaura o
  canvas sem transformar informações de React Flow em modelo de domínio.
- **JSONB para projetos:** modelos e layout são persistidos como documento
  versionado, sem normalizar cada elemento visual em tabelas.
- **IA na borda, regras no domínio:** Ollama propõe modelos; Zod, reparo
  limitado e conversores determinísticos preservam contratos e previsibilidade.
- **Autenticação no servidor e ownership por consulta:** o cookie de sessão é
  validado na API, e a propriedade vem do usuário da sessão, não do navegador.
- **CSS Modules por componente:** estilos locais reduzem acoplamento visual
  sem introduzir outra biblioteca visual.

## Testes

Os testes unitários da API usam Vitest. O Playwright cobre login E2E com API,
Better Auth e PostgreSQL reais em um database separado, usando as mesmas
migrations sem tocar no database de desenvolvimento.
