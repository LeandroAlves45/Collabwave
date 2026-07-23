# Project Architecture

## High Level Overview

Frontend (React/TypeScript/Vite) comunica com o Backend (Node/Express) por dois canais: REST HTTP para operações CRUD e Socket.io para eventos em tempo real (presença, atualização de tasks/colunas). Backend persiste em PostgreSQL via Knex, usa Redis para sessões de refresh token e para o adapter do Socket.io (permite escalar horizontalmente vários processos backend a partilhar as mesmas salas/rooms).

Separação por módulo de feature, não por camada técnica transversal (não é Clean Architecture com Domain/Application/Infrastructure). Cada módulo é dono do seu controller, service, rotas, tipos e validators.

## Backend — estrutura real (`backend/src/`)

```
backend/src/
  app.ts              // configura a app Express (middleware, rotas), não abre porta
  server.ts           // cria http.Server, inicia Socket.io, faz .listen()

  config/
    env.ts            // leitura e validação de variáveis de ambiente
    database.ts       // instância Knex ligada ao Postgres
    knexfile.ts        // config Knex por ambiente (development/test/production)
    redis.ts           // cliente ioredis + adapter do Socket.io

  middleware/
    authenticate.ts    // valida JWT em rotas HTTP protegidas
    errorHandler.ts    // último middleware Express; converte erros em JSON consistente

  modules/
    auth/              // registo, login, refresh, logout (JWT + bcrypt + Redis)
    workspaces/        // CRUD de workspaces, convites, membros
    columns/           // colunas do quadro Kanban
    tasks/             // tasks (cartões), atribuição, prioridade, posição

  sockets/
    index.ts               // inicialização do servidor Socket.io
    middleware/socketAuth.ts // autentica a ligação WS via JWT
    handlers/task.handler.ts       // eventos de tasks em tempo real
    handlers/workspace.handler.ts  // eventos de workspace/presença
    presence.service.ts    // regista quem está online por workspace
    sockets.types.ts        // tipos partilhados dos eventos

  types/    // tipos globais partilhados entre módulos
  utils/    // utilitários sem estado
```

Cada módulo segue o padrão: `*.routes.ts` (define endpoints Express) → `*.controller.ts` (lê request, chama service, escreve response) → `*.service.ts` (lógica de negócio, acesso a `db`/Knex) → `*.types.ts` + `*.validators.ts` (zod).

## Data Flow — criar uma task

1. **Frontend**: utilizador arrasta/cria task no quadro. `POST /api/columns/{columnId}/tasks` (ou endpoint equivalente em `task.routes.ts`) com o payload validado por zod no cliente (react-hook-form) antes de enviar.
2. **Rotas**: `task.routes.ts` associa o endpoint ao controller, protegido por `authenticate` middleware.
3. **Controller**: `task.controller.ts` lê `req.body`, chama `task.service.ts`.
4. **Service**: valida com `task.validators.ts` (zod), executa insert via Knex (`db('tasks').insert(...)`), devolve a entidade criada.
5. **Tempo real**: o controller (ou service) emite um evento Socket.io na room do workspace (`sockets/handlers/task.handler.ts`), propagado a todos os clientes ligados a esse workspace — incluindo entre processos backend, via `@socket.io/redis-adapter`.
6. **Resposta HTTP**: `res.status(201).json(task)` devolvido ao autor do pedido.
7. **Frontend**: Zustand store (`workspaceStore`) atualiza o estado local ao receber a resposta HTTP e/ou o evento socket; `BoardPage`/`KanbanColumn`/`TaskCard` re-renderizam.

## Autenticação

- Login/registo devolvem `accessToken` (JWT curto, `JWT_EXPIRES_IN`) e `refreshToken` (JWT longo, `JWT_REFRESH_EXPIRES_IN`), assinados com segredos distintos (`JWT_SECRET` / `JWT_REFRESH_SECRET`).
- O `jti` do refresh token é guardado no Redis (`refresh_token:<jti>` → `userId`, TTL = validade do refresh token) — permite revogação e rotação (logout apaga a chave, refresh troca o token antigo por um novo).
- Rotas HTTP protegidas usam `middleware/authenticate.ts`. Ligações Socket.io são autenticadas em `sockets/middleware/socketAuth.ts` antes de entrarem em qualquer room.

## Error Handling

`middleware/errorHandler.ts` é o último middleware da app Express. Trata três casos:
- `ZodError` → 400 com lista de campos inválidos.
- `AppError` (classe própria, erros de negócio intencionais como "email já existe") → status code definido na origem.
- Qualquer outro erro → 500, mensagem genérica em produção, mensagem real só em `NODE_ENV=development`; sempre logado no servidor.

Nunca lançar `Error("mensagem genérica")` — usar `AppError` com status code explícito.

## Real-time (Socket.io)

- `presence.service.ts` mantém o registo de utilizadores online por workspace, emitido via evento `workspace:presence_update`.
- Handlers em `sockets/handlers/` reagem a ações (mover task, criar coluna) e propagam o mesmo evento a todos os membros do workspace ligados.
- `@socket.io/redis-adapter` garante que estes eventos chegam a clientes ligados a instâncias backend diferentes (necessário assim que há mais do que um processo/replica em produção).

## Frontend Architecture

Páginas principais: `LoginPage`, `RegisterPage`, `WorkspacesPage` (lista de workspaces), `BoardPage` (quadro Kanban — ecrã central da aplicação).

Componentes reutilizáveis (`components/common/`): `Header`, `KanbanColumn`, `TaskCard`, `PriorityBadge`, `WorkspaceCard`, `WaveLine` (linha decorativa animada). Primitivas de UI hand-rolled em `components/ui/` (`Button`, `Card`, `Input`, `PasswordInput`).

Estado: Zustand (`stores/authStore.ts`, `stores/workspaceStore.ts`). Serviços: `services/api.ts` (REST) e `services/socket.ts` (Socket.io client, reconexão automática, eventos tipados).

## Segurança (resumo — detalhe em security-conventions.md)

Helmet, express-rate-limit, CORS restrito a `CORS_ORIGIN`, JWT com refresh rotativo guardado em Redis, bcrypt (custo 12) para passwords, zod para validação de todo o input (HTTP e, onde aplicável, eventos de socket).

## Performance Considerations

Índices Knex em `(workspace_id, position)` para colunas, `(column_id, position)` e `(assignee_id)`/`(created_by)` para tasks, `(workspace_id, created_at)` para activity log — todos pensados para as queries reais de listagem do quadro. Atenção a N+1 ao carregar tasks + colunas + membros de um workspace numa só chamada de board. Bundle do frontend via Vite; monitorizar tamanho ao adicionar dependências.
