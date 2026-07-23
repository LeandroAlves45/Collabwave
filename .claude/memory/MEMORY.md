# Memory Index

## Estado Atual

**2026-07-23**: `.claude/` limpo de resíduos do projeto anterior ("Chatbot", .NET) e reescrito para refletir o CollabWave real (Node/Express/Socket.io/Knex + React/Vite). `.vscode/` também limpo de configuração .NET. Ver [sessão de conclusão](Sessions/2026-07-23-claude-vscode-cleanup-e-ui-redesign.md) para detalhe do que foi alterado.

Backend e frontend funcionalmente maduros (testes Jest/Vitest/Playwright a passar, CI configurado). Deploy (Render + Vercel) está a ser tratado à parte pelo utilizador, fora do âmbito desta pasta `.claude`.

## Próximos Passos

- Redesign de UI/UX futurista (fase 1: ligar indicador de ligação, presença online e flash de tasks já scaffolded; fase 2: direção visual com a skill `ui-ux-pro-max`) — ver detalhe na sessão de conclusão referida acima.
- Confirmar após o deploy (tratado externamente) se `CORS_ORIGIN` e URLs do frontend/backend estão sincronizados entre Render e Vercel.

## Gotchas / Notas Importantes

- Migration `003_create_workspace_menbers` tem erro de digitação no nome do ficheiro ("menbers") — já aplicada, não renomear; só ter atenção ao nomear novas migrations relacionadas com membros.
- `backend/Dockerfile` tinha `CMD ["node", "dist/app.js"]`, mas o entry point real de produção é `dist/server.js` (`app.ts` só configura a Express app, não abre porta nem inicia o Socket.io — isso é feito em `server.ts`). Encontrado durante a auditoria de deploy de 2026-07-23; corrigido ou a corrigir pelo Codex, que está a tratar do workstream de deploy.
- Convenção de idiomas: falar sempre em português (regra pessoal do utilizador, mantida entre projetos); código/comentários também em português de Portugal.
