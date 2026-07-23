---
name: debug-fix
description: Finds and fixes bugs no CollabWave (backend Express/Knex/Socket.IO ou frontend React/Zustand) com um workflow disciplinado de reproduzir, causa raiz, teste de regressão. Usa quando o utilizador reporta um bug, erro, stack trace, regressão, teste a falhar, ou pede para corrigir/debugar algo.
---

# Debug & Fix — CollabWave

Workflow disciplinado para corrigir bugs no stack CollabWave (Node 20/Express 5/Knex/Socket.io/Redis no backend, React 19/Zustand no frontend), sem soluções temporárias.

## Workflow

### 1. Reproduzir
- Confirmar o bug localmente antes de tocar em código: correr o backend (`npm run dev` em `backend/`) e o frontend (`npm run dev` em `frontend/`), ou o teste que falha (`npm run test:ci` / `npm run test`).
- Se for um bug de tempo real (Socket.io), reproduzir com dois clientes/browsers ligados ao mesmo workspace/board para confirmar o comportamento exato de fan-out ou presença.
- Anotar o comportamento observado vs esperado antes de investigar.

### 2. Causa Raiz
- Backend: seguir a cadeia `controller → service → routes`/`.validators.ts` do módulo em causa (`backend/src/modules/{auth,workspaces,columns,tasks}`), ou o handler relevante em `backend/src/sockets/handlers/`.
- Frontend: seguir o fluxo de estado Zustand (store → hook → componente) e confirmar se o problema é de estado local, de sincronização com o socket, ou de chamada à API (`backend/src/services/api.ts`).
- Não corrigir sintomas — identificar exatamente a linha/condição que causa o comportamento errado antes de escrever qualquer alteração.
- Verificar logs do backend e a consola do browser antes de assumir a causa.

### 3. Corrigir
- Alteração mínima e cirúrgica no ponto identificado como causa raiz.
- **Nunca editar uma migration Knex já aplicada** — se o bug exigir alteração de schema, criar sempre uma nova migration com `npm run migrate:make` em vez de tocar em `backend/migrations/*.ts` existentes.
- Não aproveitar para refatorar código adjacente não relacionado com o bug.

### 4. Teste de Regressão
- Escrever ou atualizar um teste que falharia sem a correção (Jest/Supertest no backend, Vitest/RTL no frontend, ou Playwright se for um fluxo E2E).
- Correr apenas o ficheiro de teste relevante primeiro (feedback rápido), depois a suite completa antes de dar o bug como resolvido.
- Nunca marcar como corrigido sem correr o teste e ver o resultado — evidência antes de afirmação.

## Modo Emergência (`--fast`)

Para hotfixes de produção urgentes: reproduzir e aplicar a correção mínima imediatamente, saltando a escrita de teste de regressão nesse momento — mas registar um TODO explícito para adicionar o teste depois, e nunca saltar a etapa de causa raiz mesmo em modo rápido.

## Fora de Âmbito

Refatorações amplas ou mudanças arquiteturais durante uma correção de bug — isso é trabalho separado, a propor depois do fix estar validado.
