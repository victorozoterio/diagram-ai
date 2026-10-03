# Diagram.AI

O Diagram.AI é uma aplicação web para construir diagramas de banco de dados em dois níveis: **conceitual (notação Chen)** e **lógico (tabelas e colunas)**. O usuário pode modelar manualmente, descrever o domínio em texto ou ditar uma descrição em português. A IA auxilia a geração dos modelos, mas as conversões entre os dois níveis e a geração de SQL são determinísticas, implementadas no backend.

O projeto procura reduzir o trabalho de transformar requisitos narrados em um modelo editável: antes da geração, o assistente pode perguntar sobre ambiguidades estruturais; depois, o diagrama continua disponível para edição, exportação e salvamento na conta do usuário.

## Funcionalidades implementadas

| Área | O que existe hoje |
| --- | --- |
| Conta | Cadastro e login por e-mail/senha; entrada com Google ou GitHub via Better Auth; sessão por cookie; logout. |
| Meus diagramas | Listagem por usuário, busca local por nome, criação de projeto vazio, abertura, renomeação inline e exclusão com confirmação. |
| Conceitual | Editor Chen com entidades, atributos (inclusive compostos e multivalorados), relacionamentos, cardinalidades e generalização/especialização; criação pela biblioteca, drag-and-drop, conexões, edição de nomes, redimensionamento e ajuste visual das edges. |
| Lógico | Tabelas com edição de nome e campos, tipos, PK, FK, nullable, unique e referência a outra tabela/campo; conexões visuais decorrentes das FKs; reposicionamento e redimensionamento. |
| Assistente | Entrada textual ou gravação de voz PT-BR; análise de ambiguidades com perguntas sequenciais; geração por Ollama do modelo correspondente à aba ativa. A transcrição apenas preenche o campo de descrição; não dispara a geração. |
| Conversões | Conceitual → lógico e lógico → conceitual no backend, sem IA. A volta ao conceitual é parcialmente reversível: recupera estruturas quando há informação suficiente e não inventa dados perdidos. |
| SQL | Geração determinística a partir do modelo lógico para PostgreSQL, MySQL, MariaDB e SQL Server, com visualização, cópia e download `.sql`. |
| Persistência | Projetos do usuário em PostgreSQL como JSONB no formato versionado do Diagram.AI; salvar manualmente; autosave a cada 2 minutos **somente quando há alterações**; indicação de status. |
| Proteção da edição | Confirmação para sair do editor com alterações não salvas; possibilidade de salvar antes de sair; aviso nativo do navegador ao fechar/recarregar a página quando necessário. |
| Arquivos e imagem | Abrir/baixar projeto editável `.diagramai`; copiar imagem; exportar PNG e PDF. O arquivo editável guarda modelo semântico e estado visual do canvas. |
| Navegação | Canvas React Flow com zoom/pan, enquadramento do diagrama, seleção e controles visuais; modos conceitual e lógico independentes na interface. |

## Tecnologias

As versões abaixo são as **declarações dos `package.json`**, não versões mínimas universais. O `pnpm-lock.yaml` fixa a resolução efetivamente instalada.

| Camada | Tecnologias declaradas |
| --- | --- |
| Frontend | React `^19.2.8`, TypeScript `~6.0.2`, Vite `^8.2.0`, CSS Modules, React Icons `5.5.0` |
| Canvas e layout | `@xyflow/react ^12.11.2`, `elkjs ^0.12.0` |
| Formulários/validação web | React Hook Form `7.66.1`, resolvers `5.2.2`, Zod `4.1.12` |
| Imagem e PDF | `html-to-image ^1.11.13`, `jspdf ^4.2.1` |
| Backend | NestJS `^11.0.1`, TypeScript `^5.7.3`, Express `5.2.1`, Swagger `^11.4.4` |
| Banco/ORM | PostgreSQL `15-alpine` no Compose; Prisma Client e CLI `^7.10.0`, adapter `@prisma/adapter-pg ^7.10.0`, `pg ^8.23.0` |
| Autenticação | Better Auth e adapter Prisma `1.7.6`; credenciais e OAuth Google/GitHub |
| IA de modelagem | Ollama HTTP local; modelo selecionado por `OLLAMA_MODEL` (exemplo de desenvolvimento: `qwen2.5:7b-instruct`) |
| Voz | `MediaRecorder` no navegador; FFmpeg e `whisper-cli` de whisper.cpp executados pelo backend |
| Validação API | Zod `^4.4.3`, `class-validator ^0.15.1`, `class-transformer ^0.5.1` |
| Monorepo/ferramentas | pnpm workspaces; Biome `^2.5.1`, Husky `^9.1.7`, Commitlint `^21.1.0` |

## Arquitetura e organização

```text
diagram-ai/
├── apps/
│   ├── api/
│   │   ├── docker-compose.yaml          # PostgreSQL local
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # User, Account, Session, Verification, Diagram
│   │   │   └── migrations/
│   │   ├── prisma.config.ts
│   │   ├── .env.example
│   │   └── src/
│   │       ├── ai/                      # prompts, Ollama, parser, ambiguidades
│   │       ├── auth/                    # Better Auth e guarda de sessão
│   │       ├── diagrams/                # projetos, conversões e SQL
│   │       ├── prisma/                  # PrismaService/PrismaModule
│   │       └── speech/                  # FFmpeg e whisper.cpp
│   └── web/
│       ├── .env.example
│       └── src/
│           ├── api/                     # cliente das operações de diagrama
│           ├── auth/                    # cliente Better Auth
│           ├── features/
│           │   ├── auth/                # login, cadastro e menu da conta
│           │   └── diagrams/            # páginas, canvas, hooks e tipos
│           └── routes/                  # roteamento e paths
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

`apps/web` mantém o estado de edição e traduz modelos para nodes/edges do React Flow. `apps/api` valida as entradas, chama Ollama quando a operação requer IA, converte modelos e SQL sem IA, transcreve áudio usando processos locais e persiste projetos por Prisma. O `PrismaService` usa o driver `pg` via `@prisma/adapter-pg`. O Better Auth usa o mesmo serviço Prisma e suas tabelas padrão. Os dados do projeto ficam em `Diagram.content` (JSONB), sem normalizar cada elemento do diagrama em tabelas separadas.

As rotas web são `/login`, `/cadastro`, `/` (**Meus diagramas**), `/editor` e `/editor/:id`. A navegação web consulta a sessão para liberar a área principal. No backend, **todas as rotas de `/diagrams` exigem sessão válida** por `SessionAuthGuard`. As rotas de projetos também restringem leitura/escrita ao proprietário pelo `userId` obtido da sessão; autenticação e ownership são verificações complementares.

### Evolução técnica

1. Organização em monorepo com editor React e API NestJS.
2. Domínios conceitual e lógico, seus schemas e edição visual no React Flow.
3. Assistência por Ollama, validação/reparo do modelo, perguntas de ambiguidade e conversões determinísticas.
4. Exportação de imagem, arquivo editável versionado e geração de SQL em quatro dialetos.
5. Prisma/PostgreSQL, Better Auth e projetos persistidos por usuário com salvamento e autosave.
6. Entrada por voz no assistente usando MediaRecorder → FFmpeg → whisper.cpp.

## Diagramas da implementação

### 1. Arquitetura geral

```mermaid
flowchart LR
    U[Usuário] --> W[React]
    W -->|HTTP e cookie de sessão| API[NestJS]
    W -->|áudio MediaRecorder| API
    API --> AUTH[Better Auth]
    AUTH --> PRISMA[PrismaService]
    API --> PRISMA
    PRISMA --> PG[(PostgreSQL)]
    API --> AI[OllamaProvider]
    AI --> OLLAMA[Ollama]
    API --> STT[WhisperSpeechToTextProvider]
    STT --> FFMPEG[FFmpeg]
    STT --> WHISPER[whisper-cli]
    W -->|captura PNG/PDF no navegador| IMG[html-to-image / jsPDF]
```

### 2. DER do banco

O DER apresenta as entidades e relacionamentos relevantes ao domínio e à autenticação do Diagram.AI. Tabelas auxiliares internas utilizadas pelo Better Auth, como `Verification`, foram omitidas para preservar a clareza do modelo.

```mermaid
erDiagram
    User ||--o{ Account : possui
    User ||--o{ Session : possui
    User ||--o{ Diagram : possui

    User {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
    }
    Account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string idToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        string scope
        string password
        datetime createdAt
        datetime updatedAt
    }
    Session {
        string id PK
        datetime expiresAt
        string token UK
        datetime createdAt
        datetime updatedAt
        string ipAddress
        string userAgent
        string userId FK
    }
    Diagram {
        string id PK
        string name
        json content
        string userId FK
        datetime createdAt
        datetime updatedAt
    }
```

### 3. Casos de uso principais

```mermaid
flowchart LR
    U([Usuário]) --> AUTH{Conta}
    AUTH --> CAD[Cadastar e entrar por e-mail/senha]
    AUTH --> SOC[Entrar com Google ou GitHub]
    AUTH --> OUT[Sair]
    U --> PROJ{Meus diagramas}
    PROJ --> NOVO[Criar e abrir]
    PROJ --> LIST[Buscar, renomear e excluir]
    U --> EDIT{Editor}
    EDIT --> CONC[Editar modelo conceitual]
    EDIT --> LOG[Editar modelo lógico]
    EDIT --> VOZ[Gravar e transcrever descrição]
    EDIT --> AMB[Responder ambiguidades]
    EDIT --> GER[Gerar modelo por IA]
    EDIT --> CONV[Converter entre modelos]
    EDIT --> SQL[Visualizar, copiar e baixar SQL]
    EDIT --> SALV[Salvar e autosalvar na nuvem]
    EDIT --> ARQ[Abrir/baixar .diagramai]
    EDIT --> IMAG[Copiar imagem, exportar PNG/PDF]
```

### 4. Classes e contratos centrais existentes

O diagrama omite utilitários para legibilidade. `DiagramAiProject`, `ConceptualModel` e `LogicalModel` são tipos/estruturas de dados; não são classes instanciadas em runtime. As setas indicam uso/injeção ou transformação, sem tentar representar todas as chamadas.

```mermaid
classDiagram
    class DiagramGeneratorPage
    class useDiagramEditor
    class ConceptualDiagramFlow
    class LogicalModelFlow
    class DiagramAiProject {
        format
        version
        modelType
        semanticModel
        visual
    }
    class ConceptualModel
    class LogicalModel
    class DiagramsController
    class DiagramProjectsController
    class DiagramsService
    class DiagramProjectsService
    class AiService
    class OllamaProvider
    class LogicalModelConverterService
    class LogicalToConceptualConverterService
    class SqlGeneratorService
    class SpeechToTextService
    class SpeechToTextProvider {
        <<interface>>
        transcribe(audio)
    }
    class WhisperSpeechToTextProvider
    class PrismaService
    class AuthService

    DiagramGeneratorPage --> useDiagramEditor
    DiagramGeneratorPage --> ConceptualDiagramFlow
    DiagramGeneratorPage --> LogicalModelFlow
    DiagramGeneratorPage --> DiagramAiProject
    DiagramAiProject --> ConceptualModel
    DiagramAiProject --> LogicalModel
    DiagramsController --> DiagramsService
    DiagramsController --> SpeechToTextService
    DiagramProjectsController --> DiagramProjectsService
    DiagramsService --> AiService
    DiagramsService --> LogicalModelConverterService
    DiagramsService --> LogicalToConceptualConverterService
    DiagramsService --> SqlGeneratorService
    AiService --> OllamaProvider
    LogicalModelConverterService --> LogicalModel
    LogicalToConceptualConverterService --> ConceptualModel
    SpeechToTextService --> SpeechToTextProvider
    SpeechToTextProvider <|.. WhisperSpeechToTextProvider
    DiagramProjectsService --> PrismaService
    AuthService --> PrismaService
```

### 5. Atividade: gerar e salvar um modelo

```mermaid
flowchart TD
    A([Início]) --> B{Entrada}
    B -->|Texto| D[Descrição no assistente]
    B -->|Voz| C[MediaRecorder → API → FFmpeg → whisper-cli]
    C --> D
    D --> E[Analisar ambiguidades com Ollama]
    E --> F{Há perguntas?}
    F -->|Sim| G[Usuário responde e confirma]
    F -->|Não| H[Gerar modelo do modo ativo]
    G --> H
    H --> I[Parser e validação do schema]
    I --> J{Modelo inválido?}
    J -->|Sim, ainda há tentativa| K[Reparo com modelo anterior e erros]
    K --> I
    J -->|Sim, limite atingido| ER[Mostrar erro, preservar trabalho]
    J -->|Não| L[Mapear modelo e auto-layout no canvas]
    L --> M[Edição manual]
    M --> N[Marcar alterações não salvas]
    N --> O{Salvar manualmente ou autosave com dirty?}
    O -->|Sim| P[API → Prisma → PostgreSQL]
    O -->|Não| M
    P --> Q([Modelo salvo])
```

O mesmo ciclo vale para geração conceitual e lógica: **IA → validação Zod → reparo automático quando inválido → nova validação**. O backend envia o modelo anterior e os erros de validação para o reparo; o limite atual é de **duas tentativas de validação** (geração inicial e um reparo), sem retries ilimitados.

### 6. Sequência: descrição por voz ou texto até persistência

```mermaid
sequenceDiagram
    actor Usuario as Usuário
    participant Web as apps/web
    participant API as DiagramsController
    participant STT as SpeechToTextService
    participant FF as FFmpeg
    participant WH as whisper-cli
    participant DS as DiagramsService
    participant AI as OllamaProvider
    participant OL as Ollama/Qwen
    participant PC as DiagramProjectsController
    participant PS as DiagramProjectsService
    participant PR as PrismaService
    participant DB as PostgreSQL

    opt Entrada por voz
        Usuario->>Web: Grava e encerra áudio
        Web->>API: POST /diagrams/transcribe-audio
        API->>STT: transcribe(audio)
        STT->>FF: Converter para WAV mono 16 kHz
        FF-->>STT: WAV
        STT->>WH: Transcrever com idioma pt
        WH-->>STT: Texto
        STT-->>Web: Texto para revisão no textarea
    end
    Usuario->>Web: Clica Gerar modelo
    Web->>API: POST /diagrams/analyze-ambiguities
    API->>DS: analyzeAmbiguities
    DS->>AI: analisar descrição
    AI->>OL: /api/chat
    OL-->>AI: JSON de perguntas
    AI-->>Web: Perguntas validadas
    opt Há ambiguidades
        Web->>Usuario: Exibe perguntas sequenciais
        Usuario->>Web: Responde
    end
    Web->>API: POST /diagrams/generate
    API->>DS: generate(descrição, modo, respostas)
    DS->>AI: gerar modelo
    AI->>OL: /api/chat
    OL-->>AI: JSON do modelo
    AI-->>DS: Modelo interpretado
    DS-->>Web: Modelo validado
    Web->>Web: Montar canvas e editar
    opt Salvar com sessão
        Web->>PC: POST/PATCH /diagrams/projects
        PC->>PS: create/update com usuário da sessão
        PS->>PR: create/update com userId da sessão
        PR->>DB: Gravar Diagram.content JSONB
        DB-->>PR: Confirma gravação
        PR-->>PS: Projeto persistido
        PS-->>PC: Projeto salvo
        PC-->>Web: Resposta do projeto
    end
```

## Pré-requisitos por sistema

| Sistema | Preparação local |
| --- | --- |
| Windows | Git, Node.js `24.19.0`, pnpm `11.7.0`/Corepack, Docker Desktop com Compose, Ollama para Windows, FFmpeg no `PATH`, CMake e compilador C/C++ (por exemplo, Visual Studio Build Tools) para whisper.cpp. Execute os comandos Bash no Git Bash/WSL ou use os equivalentes PowerShell indicados. |
| macOS | Git, Node.js `24.19.0`, pnpm `11.7.0`/Corepack, Docker Desktop, Ollama para macOS, FFmpeg, CMake e ferramentas de compilação do Xcode Command Line Tools. Homebrew é uma forma de instalar ferramentas, não uma dependência da aplicação. |
| Linux | Git, Node.js `24.19.0`, pnpm `11.7.0`/Corepack, Docker Engine com plugin Compose (ou Docker Desktop), Ollama para Linux, FFmpeg, CMake e toolchain C/C++ (`build-essential` ou equivalente). |

O projeto fixa **Node.js `24.19.0`** em `.nvmrc` e **pnpm `11.7.0`** em `packageManager` no `package.json` raiz. A versão instalada de Vite 8 declara suporte a Node `^20.19.0 || >=22.12.0`; portanto, Node `24.19.0` atende ao requisito. Docker é usado aqui para o PostgreSQL; Ollama, FFmpeg e whisper.cpp são serviços/binários locais separados. É necessário navegador com suporte a `MediaRecorder` para voz e permissão de microfone; em produção, use contexto seguro (HTTPS).

Com [nvm](https://github.com/nvm-sh/nvm), na raiz do repositório, execute:

```bash
nvm install
nvm use
node --version
```

O nvm lê automaticamente o valor de `.nvmrc`. Para pnpm, o Node 24 inclui Corepack; habilite-o e confira a versão declarada pelo projeto:

```bash
corepack enable
corepack install
pnpm --version
```

Caso Corepack não esteja disponível, instale explicitamente `pnpm@11.7.0` conforme a [documentação oficial](https://pnpm.io/installation), depois confirme com `pnpm --version`.

## Instalação completa a partir do clone

Os comandos de pnpm abaixo partem **da raiz do repositório**, salvo indicação contrária.

1. **Clonar e instalar dependências**:

   ```bash
   git clone https://github.com/victorozoterio/diagram-ai.git
   cd diagram-ai
   corepack enable
   corepack install
   pnpm install
   ```

   O projeto usa Node `24.19.0` e pnpm `11.7.0`. Com nvm, execute antes `nvm install` e `nvm use`; o `.nvmrc` é lido automaticamente. Se Corepack não estiver disponível, instale explicitamente `pnpm@11.7.0` conforme a [documentação oficial](https://pnpm.io/installation). Confirme o ambiente com `node --version` e `pnpm --version`. `pnpm install` instala o Biome e as dependências do monorepo; executar `npm run format` sem essa instalação resulta em `biome: command not found`.

2. **Criar os arquivos de ambiente**. No macOS/Linux/Git Bash:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Em PowerShell: `Copy-Item apps/api/.env.example apps/api/.env` e `Copy-Item apps/web/.env.example apps/web/.env`. Preencha cada variável conforme a seção seguinte. Deixe `apps/api/.env` e `apps/web/.env` fora do Git.

3. **Subir PostgreSQL**:

   ```bash
   docker compose -f apps/api/docker-compose.yaml up -d
   docker compose -f apps/api/docker-compose.yaml ps
   ```

4. **Aplicar migrations existentes e gerar o cliente Prisma**:

   ```bash
   pnpm --filter @diagram-ai/api prisma:migrate:deploy
   pnpm --filter @diagram-ai/api prisma:generate
   ```

   Para criar **novas** migrations durante desenvolvimento, existe `pnpm --filter @diagram-ai/api prisma:migrate:dev`; não é necessário criar uma migration nova para iniciar este repositório. Veja também `prisma:studio`.

5. **Instalar/iniciar Ollama e baixar o modelo** (detalhes abaixo): `ollama pull qwen2.5:7b-instruct`; configure exatamente esse identificador em `OLLAMA_MODEL`. Se escolher outro modelo, altere a variável e faça o pull correspondente.
6. **Instalar FFmpeg e compilar whisper.cpp** se desejar entrada por voz; configure os caminhos reais do binário e do modelo multilíngue no `.env` da API (instruções abaixo).
7. **Iniciar API e web em terminais separados**:

   ```bash
   pnpm dev:api
   ```

   ```bash
   pnpm dev:web
   ```

8. Abra `http://localhost:5173`, cadastre-se/entre e crie um diagrama. A API usa `http://localhost:3000` por padrão e expõe Swagger em `http://localhost:3000/docs`.

### Variáveis de ambiente

Todos os exemplos usam desenvolvimento local. **Não copie o exemplo como secret de produção.** O arquivo da API é `apps/api/.env`; o da web é `apps/web/.env`. Variáveis com valor vazio em `.env.example` são *placeholders*. Google e GitHub OAuth são opcionais: o setup mínimo funciona com cadastro/login por e-mail e senha, sem credenciais sociais.

| Variável / arquivo | Finalidade e uso no código | Exemplo de desenvolvimento e obtenção | Segredo? / produção |
| --- | --- | --- | --- |
| `PORT` / API | Porta HTTP em `main.ts`; schema em `config/environments.ts` (padrão `3000`). | `PORT=3000`; escolha uma porta livre. | Não; alinhar URLs e proxy de produção. |
| `DATABASE_URL` / API | Prisma CLI em `prisma.config.ts` e conexão via `PrismaService`. | `DATABASE_URL=postgresql://postgres:root@localhost:5432/diagram-ai`, derivado do Compose. | **Sim**; use credenciais próprias, banco gerenciado e conexão adequada em produção. |
| `WEB_APP_URL` / API | Origem permitida no CORS de `main.ts` e `trustedOrigins` do Better Auth; padrão do schema `http://localhost:5173`. | `WEB_APP_URL=http://localhost:5173`; use a URL real do Vite. | Não; em produção, URL HTTPS exata da web. |
| `BETTER_AUTH_URL` / API | URL base de Better Auth e geração dos callbacks em `auth.options.ts`. | `BETTER_AUTH_URL=http://localhost:3000`; use endereço externo real da API. | Não; em produção, URL HTTPS pública da API, igual à cadastrada nos providers. |
| `BETTER_AUTH_SECRET` / API | Assinatura/segurança interna de Better Auth, mínimo de 32 caracteres em `environments.ts`. | Gere com `openssl rand -base64 32` e copie o resultado para o `.env`. | **Sim**; gere outro para produção e armazene em secret manager. |
| `GOOGLE_CLIENT_ID` / API | Opcional. Identifica o aplicativo Google no `AuthService` quando Google OAuth está habilitado. | ID do cliente OAuth criado no Google Cloud, tipo **Web application**. Deve ser configurado junto com `GOOGLE_CLIENT_SECRET`. | Identificador público; não deve ser inventado. Em produção, use configuração do ambiente. |
| `GOOGLE_CLIENT_SECRET` / API | Opcional. Credencial Google do provider Better Auth. | Secret do mesmo cliente OAuth Google. Deve ser configurado junto com `GOOGLE_CLIENT_ID`. | **Sim**; não expor no frontend/Git. |
| `GITHUB_CLIENT_ID` / API | Opcional. Identifica a OAuth App GitHub no `AuthService` quando GitHub OAuth está habilitado. | Client ID da OAuth App criada nas configurações do GitHub. Deve ser configurado junto com `GITHUB_CLIENT_SECRET`. | Identificador público; configure por ambiente. |
| `GITHUB_CLIENT_SECRET` / API | Opcional. Credencial GitHub do provider Better Auth. | Client secret gerado para a OAuth App GitHub. Deve ser configurado junto com `GITHUB_CLIENT_ID`. | **Sim**; não expor no frontend/Git. |
| `OLLAMA_BASE_URL` / API | Endereço da API Ollama em `OllamaProvider` (`/api/chat`). | `OLLAMA_BASE_URL=http://localhost:11434`; endereço do servidor local. | Não; em produção, restrinja o acesso ao serviço. |
| `OLLAMA_MODEL` / API | Nome enviado como `model` nas requisições Ollama. | `OLLAMA_MODEL=qwen2.5:7b-instruct` após `ollama pull qwen2.5:7b-instruct`. | Não; mantenha igual a um modelo instalado no servidor. |
| `WHISPER_CPP_BINARY_PATH` / API | Caminho executável do `whisper-cli` em `WhisperSpeechToTextProvider`. | Unix: `/caminho/whisper.cpp/build/bin/whisper-cli`; Windows: `C:\\caminho\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe` (confirme o caminho gerado). | Não; ajuste ao filesystem do host da API. Opcional no schema, mas indispensável para voz. |
| `WHISPER_CPP_MODEL_PATH` / API | Arquivo `.bin` multilíngue usado pelo Whisper. | `/caminho/whisper.cpp/models/ggml-base.bin` ou caminho Windows correspondente; baixe o modelo `base`, **não** `base.en`. | Não; ajuste ao host da API. Opcional no schema, mas indispensável para voz. |
| `WHISPER_CPP_LANGUAGE` / API | Código passado a `whisper-cli -l` (padrão `pt`). | `WHISPER_CPP_LANGUAGE=pt`; valor suportado pelo binário. | Não; preserve `pt` para transcrição em português. |
| `FFMPEG_BINARY_PATH` / API | Executável que converte áudio para WAV mono 16 kHz (padrão `ffmpeg`). | `FFMPEG_BINARY_PATH=ffmpeg` se estiver no `PATH`; no Windows pode usar caminho absoluto para `ffmpeg.exe`. | Não; caminho do executável no host da API. |
| `SPEECH_TO_TEXT_TIMEOUT_MS` / API | Timeout de cada execução externa de FFmpeg/Whisper; padrão `120000` ms. | `SPEECH_TO_TEXT_TIMEOUT_MS=120000`; ajuste conforme máquina/modelo. | Não; dimensione conforme recursos de produção. |
| `VITE_API_URL` / web | URL da API em `diagrams.api.ts` e base URL do cliente Better Auth. | `VITE_API_URL=http://localhost:3000`; deve coincidir com a API acessível ao navegador. | Não; variáveis `VITE_` são expostas no bundle, portanto nunca coloque segredo aqui. Em produção, URL HTTPS pública da API. |

### Autenticação social (opcional)

Google e GitHub OAuth são opcionais. Para desenvolvimento local, é possível deixar as quatro variáveis sociais vazias e utilizar somente cadastro/login por e-mail e senha. Quando um provider não está configurado, ele não é enviado ao Better Auth e seu botão não aparece nas telas de login e cadastro.

Para habilitar Google, configure o par completo:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Para habilitar GitHub, configure o par completo:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Preencher somente uma variável de qualquer provider faz a API falhar na inicialização com uma mensagem que informa que o ID e o secret precisam ser configurados juntos. Credenciais reais devem ser obtidas dos respectivos providers.

#### Configurar Google e GitHub OAuth

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), escolha/crie um projeto, configure a tela de consentimento e crie um **OAuth client ID** do tipo **Web application**. Cadastre `http://localhost:5173` como origem JavaScript autorizada quando solicitado e a **Authorized redirect URI** exata `http://localhost:3000/api/auth/callback/google`. Copie ID e secret para `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Se `BETTER_AUTH_URL` mudar, derive novamente o callback como `${BETTER_AUTH_URL}/api/auth/callback/google`.
2. Em [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers), crie uma **OAuth App**. Use `http://localhost:5173` como Homepage URL de desenvolvimento e `http://localhost:3000/api/auth/callback/github` como Authorization callback URL. Copie Client ID e gere Client Secret para as variáveis GitHub. O código solicita `user:email` ao GitHub. Com outra `BETTER_AUTH_URL`, o callback passa a ser `${BETTER_AUTH_URL}/api/auth/callback/github`.
3. Em produção, cadastre callbacks HTTPS correspondentes à **URL pública da API**, ajuste `WEB_APP_URL` para a origem pública da web e confirme CORS/trusted origins. O código não implementa manualmente o fluxo OAuth nem armazena token de sessão em `localStorage`.

### PostgreSQL, Docker e Prisma

O Compose real está em `apps/api/docker-compose.yaml`: imagem `postgres:15-alpine`, container `diagram-ai-db`, porta local `5432`, database `diagram-ai`, usuário `postgres`, senha de desenvolvimento `root`, volume nomeado `postgres_data`. A URL correspondente é `postgresql://postgres:root@localhost:5432/diagram-ai`.

```bash
docker compose -f apps/api/docker-compose.yaml up -d
docker compose -f apps/api/docker-compose.yaml ps
pnpm --filter @diagram-ai/api prisma:migrate:deploy
pnpm --filter @diagram-ai/api prisma:generate
pnpm --filter @diagram-ai/api prisma:studio
```

O schema fica em `apps/api/prisma/schema.prisma`; `apps/api/prisma.config.ts` lê `DATABASE_URL`. As migrations existentes criam as tabelas do Better Auth e `Diagram`. Se precisar reiniciar **somente o serviço** sem apagar dados, use `docker compose -f apps/api/docker-compose.yaml restart`. Para limpar dados de desenvolvimento, **não há script de reset seguro no projeto**; faça backup antes e saiba que remover o volume do Compose ou executar reset de migrations apaga os projetos salvos. Não execute isso em produção.

### Ollama e modelo Qwen

Instale [Ollama](https://docs.ollama.com/quickstart) no sistema operacional correspondente (aplicativo/instalador para Windows e macOS; procedimento oficial para Linux). Em seguida:

```bash
ollama pull qwen2.5:7b-instruct
ollama list
ollama run qwen2.5:7b-instruct
```

O identificador `qwen2.5:7b-instruct` é **exemplo de configuração**, não constante fixa no código. Defina `OLLAMA_MODEL` com o mesmo identificador instalado. No macOS/Windows, o aplicativo normalmente disponibiliza o serviço; no Linux ou se ele não estiver ativo, inicie-o conforme a instalação (por exemplo, `ollama serve` em um terminal). Teste a API local em `http://localhost:11434` e mantenha `OLLAMA_BASE_URL=http://localhost:11434` se usar a porta padrão. O provider envia `stream: true`, `think: false`, `keep_alive: 10m`, `temperature: 0`, `num_ctx: 4096`, `num_predict: 1536` e `repeat_penalty: 1.05`; o timeout da chamada é 120 segundos. Tanto a geração conceitual quanto a lógica aceitam no máximo **duas tentativas de validação** (geração inicial e um reparo), não retries ilimitados.

### FFmpeg + whisper.cpp para PT-BR

O frontend grava com `MediaRecorder`; a API recebe o arquivo no campo multipart `audio` (limite de **25 MiB**), cria arquivos temporários, roda FFmpeg para WAV mono 16 kHz, executa `whisper-cli -l pt`, lê o `.txt` resultante e remove os temporários. FFmpeg e Whisper não ficam rodando como serviços permanentes. Sem `WHISPER_CPP_BINARY_PATH` e `WHISPER_CPP_MODEL_PATH`, a API pode iniciar, mas a transcrição retorna indisponibilidade.

1. Instale [FFmpeg](https://ffmpeg.org/download.html) e confira `ffmpeg -version`. No macOS, pode-se usar `brew install ffmpeg`; no Linux, o gerenciador da distribuição; no Windows, baixe um build indicado no site oficial e coloque `ffmpeg.exe` no `PATH` ou defina o caminho absoluto.
2. Instale Git, [CMake](https://cmake.org/download/) e um compilador C/C++: Xcode Command Line Tools no macOS, toolchain da distribuição no Linux, Visual Studio Build Tools/compilador C++ no Windows. Clone whisper.cpp **fora do repositório Diagram.AI** se quiser manter apenas o código do app aqui.
3. No macOS/Linux, execute:

   ```bash
   git clone https://github.com/ggml-org/whisper.cpp.git
   cd whisper.cpp
   sh ./models/download-ggml-model.sh base
   cmake -B build
   cmake --build build --config Release
   ./build/bin/whisper-cli -m models/ggml-base.bin -f samples/jfk.wav -l pt
   ```

   Para testar português com um arquivo seu, converta primeiro: `ffmpeg -i entrada.mp3 -ar 16000 -ac 1 -c:a pcm_s16le entrada.wav` e execute `./build/bin/whisper-cli -m models/ggml-base.bin -f entrada.wav -l pt`. A amostra `jfk.wav` apenas confirma a execução do binário; ela não testa precisão em português.
4. No PowerShell/Windows, após instalar as ferramentas:

   ```powershell
   git clone https://github.com/ggml-org/whisper.cpp.git
   Set-Location whisper.cpp
   .\models\download-ggml-model.cmd base
   cmake -B build
   cmake --build build --config Release
   ```

   Localize `whisper-cli.exe` em `build\bin` ou `build\bin\Release` conforme o gerador CMake. Teste `ffmpeg -i entrada.mp3 -ar 16000 -ac 1 -c:a pcm_s16le entrada.wav` e `whisper-cli.exe -m models\ggml-base.bin -f entrada.wav -l pt`, usando o caminho real do executável.
5. Configure os caminhos **absolutos** do executável e de `ggml-base.bin` em `apps/api/.env`. Em Windows, use caminhos válidos no `.env`, por exemplo `C:\ferramentas\whisper.cpp\build\bin\Release\whisper-cli.exe` e `C:\ferramentas\whisper.cpp\models\ggml-base.bin`; confirme primeiro onde o build instalou os arquivos. `WHISPER_CPP_LANGUAGE=pt`, `FFMPEG_BINARY_PATH=ffmpeg` e `SPEECH_TO_TEXT_TIMEOUT_MS=120000` correspondem ao código atual. O modelo `base` é multilíngue; **não use `base.en` para PT-BR**.

## Rotina de execução

Na inicialização diária, nesta ordem:

1. PostgreSQL: `docker compose -f apps/api/docker-compose.yaml up -d`.
2. Ollama: verifique se o serviço está ativo e `ollama list` mostra o modelo configurado; se necessário, inicie `ollama serve`.
3. API: `pnpm dev:api` (porta `PORT`, padrão `3000`; Swagger em `/docs`).
4. Web: `pnpm dev:web` (Vite em `http://localhost:5173`, salvo configuração/porta ocupada).

Whisper/FFmpeg são chamados sob demanda pelo backend. Para conferir o repositório após mudanças, há `pnpm lint`, `pnpm build:api`, `pnpm build:web` e `pnpm --filter @diagram-ai/api test`. Os testes da API usam Vitest e descobrem automaticamente arquivos `src/**/*.spec.ts`; para executá-los continuamente, use `pnpm --filter @diagram-ai/api test:watch`. `pnpm format` **modifica** arquivos e não é necessário para iniciar o app.

### Teste E2E de login

O teste E2E usa Playwright/Chromium e valida a integração real entre a tela de login, Better Auth, API e a página **Meus diagramas**. Ele **nunca usa o database de desenvolvimento** `diagram-ai`: usa o database isolado `diagram-ai-e2e` na mesma instância PostgreSQL do Compose. Ollama, whisper.cpp e FFmpeg não são acionados nesse fluxo.

Prepare o ambiente E2E uma vez, após subir o PostgreSQL:

```bash
cp apps/api/.env.e2e.example apps/api/.env.e2e
```

O valor de `DATABASE_URL` em `apps/api/.env.e2e` deve apontar para `diagram-ai-e2e`, por exemplo:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/diagram-ai-e2e
```

Não reutilize a URL de desenvolvimento nesse arquivo. Antes de rodar os testes, o script cria o database E2E se necessário e executa `prisma migrate reset --force` **somente** nele, usando o mesmo `schema.prisma` e as mesmas migrations da aplicação. Como proteção, a operação exige `E2E_TESTS=true` e interrompe a execução se o nome do database não for exatamente `diagram-ai-e2e`.

Instale o navegador Chromium uma vez após instalar as dependências:

```bash
pnpm exec playwright install chromium
```

Depois, execute:

```bash
pnpm test:e2e
```

O comando prepara/reseta o banco E2E, inicia automaticamente a API em `http://127.0.0.1:3100` e o Vite em `http://127.0.0.1:5174`, e executa o teste. A conta `e2e-login@diagram-ai.test` é criada pelo endpoint real de cadastro do Better Auth; ao final, apenas essa conta E2E é removida. Para a interface interativa do Playwright, use `pnpm test:e2e:ui`. Nenhuma conta pessoal, credencial real ou dado do banco de desenvolvimento é utilizado.

## Fluxos técnicos e contratos

- **Texto e ambiguidades:** `EditorAssistant` envia a descrição para `POST /diagrams/analyze-ambiguities`; o backend chama Ollama com saída estruturada, valida as perguntas e o usuário pode respondê-las antes de gerar. `POST /diagrams/generate` recebe descrição, modo (`conceptual` ou `logical`) e esclarecimentos opcionais. Nos dois modos, a resposta passa por parser e schema Zod; se inválida, o backend reenvia o modelo anterior junto dos erros reais para um reparo automático e valida a nova resposta. A geração lógica mantém seu prompt/schema próprios e normalização das constraints.
- **Voz:** `POST /diagrams/transcribe-audio` recebe o áudio, retorna o texto em português e preenche o textarea. O usuário revê/edita antes de clicar em **Gerar modelo**; a voz não passa pelo Ollama.
- **Edição e conversões:** o modelo atual do editor é enviado a `POST /diagrams/convert-to-logical` ou `POST /diagrams/convert-to-conceptual`. O conversor conceitual→lógico trata tabelas, PK/FK, tabelas associativas, atributos compostos/multivalorados e especialização. O caminho inverso reconstrói o que é dedutível do modelo lógico; metadados de conversão ajudam a recuperar nomes/atributos compostos quando disponíveis. O canvas aplica seu layout, sem IA nessas rotas.
- **SQL:** `POST /diagrams/generate-sql` recebe `model` lógico e `dialect` (`postgresql`, `mysql`, `mariadb`, `sqlserver`). O gerador emite `CREATE TABLE` e depois FKs em `ALTER TABLE`, inclusive para referências circulares. PK composta fica na tabela; `UNIQUE` só é gerado quando `unique=true` e a coluna não é PK. Nomes de identificadores saem sem delimitadores. A interface disponibiliza cópia e `.sql`.
- **Projetos e autosave:** `POST /diagrams/projects`, `GET /diagrams/projects`, `GET/PATCH/DELETE /diagrams/projects/:id` usam cookie de sessão e `userId` obtido no backend. O editor rastreia alterações locais por modo e salva manualmente ou a cada 2 minutos se estiver dirty; saves simultâneos são coordenados e a resposta de uma revisão antiga não deve limpar alteração posterior. Ao sair com alterações, o roteador oferece continuar, descartar ou salvar; `beforeunload` cobre recarregar/fechar a aba.
- **Arquivo editável:** `.diagramai` é JSON com `format: "diagram-ai"`, `version: 1`, `exportedAt`, `modelType`, `semanticModel` e `visual` (`nodes`, `edges`, `viewport`, `state` opcional). A importação valida o formato antes de substituir o editor. `Diagram.content` usa a mesma representação. A importação de arquivo é distinta de abrir projeto salvo na nuvem.
- **Imagem:** PNG/cópia/PDF compartilham captura do diagrama no frontend; PDF usa a imagem gerada. A captura visa o diagrama, sem as barras da interface, abrangendo nodes/edges além do viewport visível.

## Solução de problemas

| Sintoma | Verificação compatível com este projeto |
| --- | --- |
| API falha na validação de ambiente | Revise `apps/api/.env`: `DATABASE_URL`, `BETTER_AUTH_URL`, secret com ≥32 caracteres e `OLLAMA_BASE_URL`/`OLLAMA_MODEL` não podem ficar vazios. OAuth é opcional, mas cada provider exige que seu ID e secret sejam preenchidos juntos. O schema Zod é a fonte da mensagem. |
| PostgreSQL indisponível/porta 5432 ocupada | `docker compose -f apps/api/docker-compose.yaml ps`; confira `DATABASE_URL`, disponibilidade da porta e logs com `docker compose -f apps/api/docker-compose.yaml logs`. O Compose usa 5432 no host. |
| Prisma não conecta ou client ausente | Confirme o banco ativo e `.env`; execute `pnpm --filter @diagram-ai/api prisma:migrate:deploy` e `pnpm --filter @diagram-ai/api prisma:generate`. Os scripts usam o cwd do pacote `apps/api`. |
| `biome: command not found` | Faça `pnpm install` na raiz e use `pnpm lint`/`pnpm format`; Biome é dependência de desenvolvimento, não comando global obrigatório. |
| Ollama inacessível/modelo ausente | Confira `OLLAMA_BASE_URL`, servidor ativo, `ollama list` e `ollama pull` com o mesmo identificador de `OLLAMA_MODEL`. |
| Geração por IA excede tempo ou retorna JSON inválido | O provider tem timeout de 120 s e contexto limitado; confira recursos/modelo do Ollama e logs da API. Tanto a geração conceitual quanto a lógica tentam um reparo e então informam falha controlada. |
| Voz diz não configurada | Preencha `WHISPER_CPP_BINARY_PATH` e `WHISPER_CPP_MODEL_PATH` com caminhos existentes; não use modelo `.en`. |
| Falha no FFmpeg/Whisper | Teste `ffmpeg -version` e execute os binários manualmente com o mesmo modelo; ajuste `FFMPEG_BINARY_PATH`. O backend converte o arquivo antes de chamar Whisper. |
| Timeout de transcrição | Ajuste `SPEECH_TO_TEXT_TIMEOUT_MS` após verificar desempenho do host/modelo; FFmpeg e Whisper recebem esse timeout individualmente. |
| Microfone negado | Conceda permissão ao navegador; use `localhost` ou HTTPS e dispositivo de entrada disponível. |
| `redirect_uri_mismatch` no Google / callback GitHub falha | Compare os callbacks cadastrados com `${BETTER_AUTH_URL}/api/auth/callback/google` ou `/github`, inclusive esquema/host/porta. Confira ID/secret do provider correspondente. |
| `Invalid origin`, sessão/cookie ou CORS | `WEB_APP_URL` deve ser a origem exata da web; `BETTER_AUTH_URL` a URL da API; `VITE_API_URL` deve apontar à API acessível no navegador. O CORS da API habilita credenciais para `WEB_APP_URL`. |
| Porta 3000/5173 ocupada | Libere as portas ou atualize `PORT`, `BETTER_AUTH_URL`, `VITE_API_URL`, `WEB_APP_URL` e callbacks OAuth de forma consistente. O Vite pode escolher outra porta se a padrão estiver ocupada. |

## Checklist de primeira execução

- [ ] Git, Node.js `24.19.0`, pnpm `11.7.0`, Docker/Compose e dependências instalados (`pnpm install`).
- [ ] `apps/api/.env` e `apps/web/.env` preenchidos; nenhum segredo enviado ao Git.
- [ ] Opcional: Google e/ou GitHub OAuth configurados com os callbacks coerentes com `BETTER_AUTH_URL`.
- [ ] PostgreSQL ativo em 5432; migrations aplicadas e Prisma Client gerado.
- [ ] Ollama ativo; `OLLAMA_MODEL` corresponde a um modelo presente em `ollama list`.
- [ ] Para voz: FFmpeg e `whisper-cli` executáveis, modelo multilíngue existente, caminhos corretos e microfone autorizado.
- [ ] API em `http://localhost:3000` e web em `http://localhost:5173` (ou URLs que você configurou).
- [ ] Cadastro/login, criação de diagrama, geração, salvamento e reabertura testados.
- [ ] `.diagramai` exportado/importado e, no modo lógico, SQL gerado no dialeto desejado.

## Referências oficiais

- [Node.js](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Docker Compose](https://docs.docker.com/compose/), [PostgreSQL](https://www.postgresql.org/docs/)
- [Prisma ORM e migrations](https://www.prisma.io/docs/orm/prisma-migrate), [NestJS](https://docs.nestjs.com/), [React](https://react.dev/), [Vite](https://vite.dev/guide/), [React Flow](https://reactflow.dev/)
- [Better Auth](https://www.better-auth.com/docs/introduction), [Google OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server), [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Ollama](https://docs.ollama.com/quickstart), [Qwen2.5 no Ollama](https://ollama.com/library/qwen2.5), [whisper.cpp](https://github.com/ggml-org/whisper.cpp), [FFmpeg](https://ffmpeg.org/documentation.html), [CMake](https://cmake.org/documentation/)
