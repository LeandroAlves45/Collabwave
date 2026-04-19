# Atualizacao E2E - 19/04/2026

## Contexto

Foi feita uma revisao da suite E2E do frontend para alinhar os testes com as portas reais de desenvolvimento:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Antes da correcao, varios specs ainda navegavam para `http://localhost:5175`, esperavam rotas antigas como `/workspaces/:id/board` e dependiam do utilizador fixo `test@example.com`.

## Playwright

`frontend/playwright.config.ts` foi atualizado para:

- usar `testDir: './tests/E2E'`;
- ignorar specs de debug com `testIgnore: ['**/debug-*.spec.ts']`;
- usar `baseURL: 'http://localhost:5173'`;
- arrancar/reutilizar o backend em `http://localhost:3001/health`;
- arrancar/reutilizar o frontend em `http://localhost:5173`;
- definir `VITE_API_URL=http://localhost:3001/api`;
- definir `VITE_SOCKET_URL=http://localhost:3001`;
- correr E2E com `workers: 1` e `fullyParallel: false`.

A execucao em serie evita flakiness causada por varios logins/registos reais em paralelo contra bcrypt, Redis e a API local.

## Helpers E2E

Foi criado `frontend/tests/E2E/helpers.ts` com helpers para:

- gerar emails unicos;
- criar utilizadores via API;
- fazer login pela UI;
- criar workspaces via API.

Isto remove a dependencia de dados manuais/preexistentes na base de dados e torna os testes repetiveis.

## Specs Atualizados

Foram atualizados:

- `frontend/tests/E2E/auth.spec.ts`
- `frontend/tests/E2E/workspaces.spec.ts`
- `frontend/tests/E2E/board.spec.ts`

Principais ajustes:

- substituidos URLs absolutos `5175` por navegacao relativa usando `baseURL`;
- seletores atualizados para a UI atual;
- password passou a usar `#password` para evitar ambiguidade com o botao `Show password`;
- rotas de board atualizadas para `/board/:id`;
- workspaces e utilizadores passaram a ser criados por teste;
- o spec `debug-board.spec.ts` deixou de entrar na suite normal.

## BoardPage

`frontend/src/pages/BoardPage.tsx` foi ajustado para refletir localmente as operacoes REST de tasks:

- criar task;
- apagar task;
- mover task;
- atualizar prioridade.

Antes, a UI dependia apenas dos eventos Socket.io para refletir algumas alteracoes. Agora o estado local e atualizado logo apos a resposta REST, e os eventos Socket.io continuam a sincronizar outras abas/utilizadores sem duplicar tasks.

## Backend Health Check

`backend/src/app.ts` foi ajustado para expor `/health` antes do rate limiter global.

Motivo: apos varias execucoes E2E, o health check podia receber `429 Too Many Requests`. Nessa situacao, o Playwright nao conseguia reutilizar o backend existente e tentava arrancar outro processo na mesma porta `3001`, causando `EADDRINUSE`.

## Validacao

Comando executado:

```bash
npm run test:e2e --prefix frontend
```

Resultado final:

```text
15 passed (28.7s)
```

## Observacao

A execucao ainda imprime um warning do Node sobre `fs.Stats constructor is deprecated`, vindo do stack de desenvolvimento. O warning nao bloqueia a suite E2E.
