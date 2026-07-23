# Project CollabWave

## What Is This

CollabWave é uma aplicação web de Kanban colaborativo em tempo real. Vários utilizadores partilham workspaces (equipas/projetos), organizam tasks em colunas (quadro Kanban), e veem as alterações uns dos outros instantaneamente via WebSockets — sem precisar de refresh.

## What It Does

Utilizador regista-se e cria ou junta-se a um workspace (via código de convite). Dentro de um workspace, cria colunas (`To Do`, `In Progress`, `Done`, ou outras) e tasks dentro delas, com título, descrição, prioridade, responsável (assignee) e data de entrega. Arrastar uma task entre colunas ou reordenar atualiza a posição e propaga o evento em tempo real a todos os membros ligados nesse workspace. Presença online (quem está a ver o quadro agora) é visível para todos os membros.

Sistema é multi-utilizador com autenticação própria (JWT). Cada workspace tem membros com `role` (`owner`, `admin`, `member`).

## Objective

Construir uma aplicação real-time production-grade: WebSockets escaláveis horizontalmente (Redis adapter), autenticação robusta com refresh tokens, testes automatizados de ponta a ponta, e uma UI que comunica visualmente a natureza colaborativa/em tempo real do produto.

## Tech Stack

Backend: Node 20, TypeScript, Express 5, Socket.io 4, Knex + PostgreSQL 15, ioredis + `@socket.io/redis-adapter`, jsonwebtoken, bcryptjs, Helmet, express-rate-limit, Jest + Supertest.

Frontend: React 19, TypeScript, Vite 6, Tailwind v4, Zustand, react-hook-form + zod, socket.io-client, lucide-react, Vitest + React Testing Library + Playwright.

Deployment: ver decisão em curso — backend Render (Postgres + Redis geridos), frontend Vercel (detalhe de deploy tratado fora desta pasta `.claude`, com apoio de outra ferramenta — ver README.MD para o estado atual).

## Project Structure

```
backend/src/modules/{auth,workspaces,columns,tasks}   — feature modules (controller/service/routes/types/validators)
backend/src/sockets                                     — Socket.io: handlers, middleware de auth, presence
backend/src/middleware                                  — authenticate, errorHandler
backend/src/config                                      — env, database (Knex), knexfile, redis
backend/migrations                                      — migrations Knex (nunca editar as já aplicadas)
frontend/src/pages                                       — LoginPage, RegisterPage, WorkspacesPage, BoardPage
frontend/src/components/common                           — Header, KanbanColumn, TaskCard, WorkspaceCard, PriorityBadge, WaveLine
frontend/src/components/ui                               — Button, Card, Input, PasswordInput (hand-rolled)
frontend/src/stores                                       — Zustand: authStore, workspaceStore
frontend/src/services                                     — api.ts (REST), socket.ts (Socket.io client)
```

## Commands To Run

Backend (a partir de `backend/`):
```
npm run dev              # nodemon + ts-node, watch em src/
npm run build             # tsc
npm run start              # node dist/server.js (produção, após build)
npm run migrate             # aplica migrations pendentes (Knex)
npm run migrate:make -- nome_da_migration
npm run migrate:rollback
npm run test:ci              # jest --ci --coverage --forceExit
npm run lint
```

Frontend (a partir de `frontend/`):
```
npm run dev            # Vite dev server, http://localhost:5173
npm run build            # tsc && vite build
npm run test               # vitest run
npm run test:e2e            # playwright test
npm run lint
```

Raiz do monorepo:
```
npm run test:ci     # backend + frontend
npm run build         # backend + frontend
npm run lint            # backend + frontend
docker compose up --build   # ambiente de dev completo (Postgres + Redis + backend)
```

## Environment Variables (ver `.env.example` na raiz, nunca ler/editar `.env` real)

Backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.

## Key Points

- Multi-utilizador real, com autenticação JWT (access + refresh) — não é um projeto single-user.
- PostgreSQL é a fonte de verdade; Redis serve refresh tokens revogáveis e o adapter do Socket.io.
- Tempo real é uma característica central do produto (presença, atualizações instantâneas de tasks), não um extra.
- Deploy: decisão tomada para Render (backend) + Vercel (frontend); execução do deploy está fora do âmbito do assistente `.claude` desta sessão — ver README.MD para o estado mais atual.
