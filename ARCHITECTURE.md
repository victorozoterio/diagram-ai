# Arquitetura

Este monorepo tem duas aplicações:

- `apps/web`: interface React para edição visual de diagramas.
- `apps/api`: API NestJS para geração e conversão dos modelos.

## Frontend

As funcionalidades vivem em `apps/web/src/features`. Cada feature é organizada por
responsabilidade: `components` apresenta e encaminha eventos, `hooks` concentra
estado e casos de uso, e `types` define o contrato do domínio.

No editor de diagramas:

- `useDiagramEditor` é o único contrato público do estado do editor.
- `hooks/editor` divide as ações por assunto: ciclo de vida, entidades, atributos,
  relacionamentos e biblioteca de elementos.
- `ConceptualDiagramFlow` apenas adapta o modelo para React Flow.
- `nodes`, `edges` e seus estilos são componentes visuais isolados.
- `flow-mappers` transforma o modelo conceitual em nós e arestas, sem alterar estado.

Ao criar um recurso, adicione-o ao menor módulo responsável. Não coloque regras de
modelo em componentes React Flow nem chamadas HTTP em componentes de apresentação.

## Convenções

- Prefira tipos do domínio em `types` e funções puras em módulos `model-*`.
- Mantenha arquivos focados; extraia quando começarem a reunir responsabilidades
  diferentes, não apenas por número de linhas.
- Cada componente mantém seu estilo em um `.module.css` ao lado.
- Comentários explicam decisões e invariantes, não descrevem código óbvio.
