# CollabWave — CLAUDE.md

Guia de contexto para o Claude Code trabalhar neste projecto.
Lê este ficheiro no início de cada sessão antes de fazer qualquer alteração.

---

## Projecto

**CollabWave** é um SaaS de gestão de tarefas colaborativo em tempo real.
Stack: Node.js 20 + Express 5 + Socket.io v4 + PostgreSQL 15 + Redis 7 + React 18 + Vite.
Documentação completa: `CollabWave_SDLC_Documentation.pdf` na raiz do repositório.

---

## Arquitectura do Backend

```text
backend/src/
  app.ts              — Configuração Express (middlewares, rotas). Nunca inicia servidor.
  server.ts           — Entry point real. Cria http.Server, inicializa Socket.io, faz db.raw('SELECT 1').
  config/
    env.ts            — Todas as env vars validadas aqui. Importar sempre via env.X, nunca process.env directamente.
    database.ts       — Instância Knex (PostgreSQL).
    redis.ts          — redisClient, pubClient, subClient (ioredis).
    knexfile.ts       — Config Knex para CLI de migrações.
  middleware/
    authenticate.ts   — Middleware HTTP JWT. Preenche req.user. Corre em cada pedido.
    errorHandler.ts   — AppError (erros operacionais) + errorHandler global (4 params).
  modules/<domínio>/
    <domínio>.routes.ts      — Router Express. Só middlewares e mapeamento de handlers.
    <domínio>.controller.ts  — Extrai req, valida com Zod, delega ao service, responde HTTP.
    <domínio>.service.ts     — Lógica de negócio. Única camada que toca na BD. Lança AppError.
    <domínio>.types.ts       — Interfaces TypeScript do domínio.
    <domínio>.validators.ts  — Schemas Zod dos request bodies.
  sockets/
    index.ts                     — initSocketServer(httpServer). Configura Redis Adapter e middleware de auth.
    sockets.types.ts             — CollabWaveSocket, CollabWaveServer, eventos tipados.
    middleware/socketAuth.ts     — Middleware WS JWT. Corre uma vez no handshake. Preenche socket.data.user.
    presence.service.ts          — Gestão de presença via Redis Sets (chave: presence:{workspaceId}).
    handlers/<domínio>.handler.ts — Listeners de eventos Socket.io por domínio.
  types/
    express.d.ts      — Augmentation global de Request com req.user. NÃO repetir declare global noutros ficheiros.
migrations/           — Ficheiros Knex. Numerados sequencialmente (001_, 002_, ...).
```

---

## Regras de Arquitectura

### Separação de camadas

- **Controller** — nunca faz queries à BD, nunca contém lógica de negócio.
- **Service** — nunca conhece `req`/`res`. Testável sem HTTP.
- **Routes** — nunca contém lógica, só wiring de middlewares e controllers.

### Erros

- Usar sempre `AppError(mensagem, statusCode)` para erros operacionais no service.
- Erros inesperados sobem via `next(error)` ou `throw` — o `errorHandler` trata-os.
- O `logout` é uma excepção: nunca lança erro (token inválido no logout é silenciado).

### Tipos TypeScript

- `req.user` está declarado em `src/types/express.d.ts`. Não adicionar `declare global` noutros ficheiros.
- Roles de workspace: `'owner' | 'admin' | 'member'`. Não existe `'editor'`.
- Genéricos do Socket.io usam sempre `CollabWaveSocket` e `CollabWaveServer` (não `Socket` ou `Server` directamente).

### Migrações

- `avatar_url` na tabela `users` é **nullable**.
- `metadata` na tabela `activity_log` é **nullable**.
- Sempre adicionar índices em colunas usadas em `WHERE` ou `ORDER BY` frequentes.

### Presença (Redis)

- Chave: `presence:{workspaceId}` (prefixo `PRESENCE_PREFIX = 'presence:'`).
- Para extrair `workspaceId` de uma chave: `key.replace(PRESENCE_PREFIX, '')` — sem `:` extra.
- `SADD` é idempotente — não cria duplicados se o mesmo user abrir dois separadores.

### Socket.io

- Imports profundos (`socket.io/dist/*`) são proibidos com `moduleResolution: Node16`. Importar apenas do package raiz: `from 'socket.io'`.
- Transports: `['websocket', 'polling']` — polling é fallback intencional para redes corporativas.
- Room de workspace: `workspace:{workspaceId}` (helper `buildRoomName`).

---

## TypeScript / tsconfig

```jsonc
"module": "Node16",
"moduleResolution": "node16"
```

`module` e `moduleResolution` devem ser sempre o mesmo valor (`Node16`/`node16`).
Não usar `"commonjs"` + `"node"` — essa combinação está deprecada desde TypeScript 5.x e será removida no 7.0.

---

## Segurança

- Rate limiting configurado via `env.RATE_LIMIT_WINDOW_MS` e `env.RATE_LIMIT_MAX_REQUESTS`. Aplicado globalmente em `app.ts` depois do `helmet()`.
- CORS restringido a `env.CORS_ORIGIN`.
- Payload máximo do body: `10kb` (protecção contra payloads gigantes).
- JWT: access token (15 min) + refresh token (7 dias, rotação a cada refresh, guardado no Redis).
- Passwords: `bcrypt` com 12 rondas.
- Login/registo: mesma mensagem de erro para email e password incorrectos (evita enumeração).

---

## ESLint

O projecto usa **ESLint v10 com flat config** (`backend/eslint.config.mjs`). O ficheiro `.eslintrc.json` está obsoleto e é ignorado pelo ESLint v10.

Convenção para código intencionalmente não usado — prefixar com `_`:

- Parâmetros de função: `(_req, res, next)` — comum em middlewares Express
- Parâmetros obrigatórios pela assinatura: `(_next: NextFunction)` no `errorHandler`
- Variáveis de desestruturação: `const { password_hash: _password_hash, ...safeUser } = user`
- Erros em catch: `catch (_err) { ... }`

A regra `@typescript-eslint/no-unused-vars` está configurada com `argsIgnorePattern`, `varsIgnorePattern` e `caughtErrorsIgnorePattern` todos com padrão `^_`.

---

## npm audit

As vulnerabilidades de `brace-expansion` são **exclusivamente em devDependencies** (jest, ts-jest, nodemon) — risco zero em produção.

A vulnerabilidade de `lodash` é transitiva via `knex` — o knex não expõe as funções vulneráveis a input externo.

Correr `npm audit fix` resolve ambas sem `--force`.

---

## Scripts úteis

```bash
# Backend (dentro de backend/)
npm run dev               # Inicia com nodemon + ts-node (server.ts)
npm run build             # Compila para dist/
npm run lint              # ESLint
npm run lint:fix          # ESLint com auto-fix
npm run test              # Jest em watch mode
npm run test:ci           # Jest com coverage (CI)
npm run migrate           # Aplica migrações pendentes
npm run migrate:rollback  # Reverte última migração
```

---

## Estado actual (Abril 2026)

- Sprint 1 (Backend Core): concluído — auth (register, login, refresh, logout) + workspace CRUD + Socket.io foundation + presença.
- A seguir: **Sprint 3 — Task Board API** (colunas e tasks REST + eventos WS task:create/update/move/delete).
- Endpoints SDD ainda não implementados: `PATCH /workspaces/:id`, `DELETE /workspaces/:id`, `DELETE /workspaces/:id/members/:uid` — reservados para sprint posterior.
