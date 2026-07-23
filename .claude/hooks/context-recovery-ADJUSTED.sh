#!/bin/bash
# Re-injects critical project rules after context compaction.
# Used as a SessionStart hook with matcher "compact".
#
# When Claude's context window fills up, compaction summarises the conversation
# and loses specific details. This hook restores non-negotiable project rules
# so Claude stays aligned even after compaction.

find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.claude" ] || [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

ROOT=$(find_project_root)

# Git commands only if in a git repository
CONTEXT=""
if [ -d "$ROOT/.git" ]; then
  BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
    CONTEXT="Branch: $BRANCH"
  fi

  LAST_COMMIT=$(git -C "$ROOT" log --oneline -1 2>/dev/null)
  if [ -n "$LAST_COMMIT" ]; then
    CONTEXT="$CONTEXT | Last commit: $LAST_COMMIT"
  fi

  CHANGES=$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CHANGES" -gt 0 ] 2>/dev/null; then
    CONTEXT="$CONTEXT | Uncommitted changes: $CHANGES files"
  fi
fi

cat <<'RULES'
=== CONTEXT RECOVERED AFTER COMPACTION ===

CRITICAL PROJECT RULES (CollabWave)
Backend: Node 20, Express 5, Socket.io 4, Knex + PostgreSQL, ioredis + @socket.io/redis-adapter, JWT
Frontend: React 19, TypeScript, Vite 6, Tailwind v4, Zustand
Kanban colaborativo em tempo real, multi-utilizador, workspaces partilhados por convite

1. ARQUITETURA MODULAR - MANDATORY
   backend/src/modules/{auth,workspaces,columns,tasks}: controller -> service -> routes, com .types.ts e .validators.ts proprios
   backend/src/sockets: handlers Socket.io por dominio, middleware de auth do socket, presence.service.ts
   backend/src/middleware: authenticate.ts, errorHandler.ts (ultimo middleware da app Express)
   backend/src/config: env.ts, database.ts (Knex), knexfile.ts, redis.ts
   NUNCA colocar logica de negocio nas rotas/controllers
   NAO e Clean Architecture com Domain/Application/Infrastructure - e modular por feature

2. DATABASE MIGRATIONS - NON-NEGOTIABLE
   Criar migrations via: npm run migrate:make -- {nome} (a partir de backend/)
   Aplicar migrations via: npm run migrate
   NUNCA editar uma migration ja existente em backend/migrations/ (pode ja ter corrido em producao)
   Nova feature = nova migration

3. ERROR HANDLING
   AppError com statusCode para erros de negocio esperados, nunca Error generico
   errorHandler.ts (middleware/errorHandler.ts) trata ZodError, AppError e erros inesperados
   Eventos Socket.io que falham devem emitir erro explicito ao cliente, nunca falhar em silencio

4. TESTING REQUIREMENTS
   Jest + Supertest no backend, Vitest + React Testing Library + Playwright no frontend
   Testes unitarios de service (backend/src/tests/unit), integracao HTTP (tests/integration)
   Correr antes de marcar tarefa concluida: npm run test:ci (raiz do monorepo)

5. SECURITY
   Secrets sempre em environment variable (ver config/env.ts), nunca no codigo ou no frontend
   Validacao de input com zod (*.validators.ts) antes de chegar ao service
   CORS restrito a CORS_ORIGIN, Helmet + express-rate-limit ativos globalmente
   JWT access + refresh com segredos distintos; jti do refresh guardado no Redis para revogacao
   Nunca logar senhas, tokens ou API keys

6. TEMPO REAL (Socket.io + Redis adapter)
   Ligacoes autenticadas em sockets/middleware/socketAuth.ts antes de entrar em qualquer room
   @socket.io/redis-adapter garante fan-out entre instancias backend
   presence.service.ts mantem utilizadores online por workspace (evento workspace:presence_update)

7. GIT WORKFLOW
   Feature branches, conventional commits
   Testes tem de passar antes de commit

COMMANDS:
  npm run dev --prefix backend                                      # Start backend (nodemon + ts-node)
  npm run test:ci --prefix backend                                  # Run backend tests
  npm run migrate:make -- {nome} --prefix backend                   # Create migration
  npm run migrate --prefix backend                                  # Apply migrations
  npm run dev --prefix frontend                                     # Start frontend (Vite)
  npm run test --prefix frontend                                    # Run frontend tests
  npm run test:ci                                                   # Backend + frontend (raiz do monorepo)
RULES

[ -n "$CONTEXT" ] && echo "" && echo "Current state: $CONTEXT"

if [ -f "$ROOT/.claude/CLAUDE.md" ]; then
  echo ""
  echo "=== CLAUDE.md (re-injected) ==="
  cat "$ROOT/.claude/CLAUDE.md"
elif [ -f "$ROOT/CLAUDE.md" ]; then
  echo ""
  echo "=== CLAUDE.md (re-injected) ==="
  cat "$ROOT/CLAUDE.md"
fi

echo ""
echo "=== END CONTEXT RECOVERY ==="
exit 0