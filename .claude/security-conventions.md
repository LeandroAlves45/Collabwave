# Security Conventions

Baseado no que existe realmente em `backend/src` — `config/env.ts`, `middleware/authenticate.ts`, `modules/auth/auth.services.ts`, `app.ts`, `sockets/middleware/socketAuth.ts`.

## Secrets e Environment Variables

Nunca hardcoded. Lidos exclusivamente via `backend/src/config/env.ts`, que falha cedo (`throw`) se uma variável obrigatória (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) estiver em falta no arranque — preferível a um erro difícil de rastrear mais tarde.

```ts
// env.ts já centraliza isto — outros módulos consomem `env.X`, nunca process.env diretamente
export const env = {
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  // ...
};
```

`.env` nunca commitado (protegido também nas regras do CLAUDE.md). Em produção (Render), variáveis configuradas no dashboard/manifest da plataforma.

## Autenticação (JWT + bcrypt + Redis)

- Passwords: `bcrypt.hash(password, 12)` no registo, `bcrypt.compare` no login (`auth.services.ts`). Nunca comparar passwords em texto plano.
- Access token: JWT curto (`JWT_EXPIRES_IN`, default `15m`), assinado com `JWT_SECRET`.
- Refresh token: JWT longo (`JWT_REFRESH_EXPIRES_IN`, default `7d`), assinado com `JWT_REFRESH_SECRET` — **segredo diferente do access token**, nunca reutilizar o mesmo.
- O `jti` (JWT ID) do refresh token é guardado no Redis (`refresh_token:<jti>` → `userId`, com `EX` = TTL do refresh) — permite revogar (logout apaga a chave) e detetar reutilização de token já revogado.
- Rotação: em cada `refresh`, o token antigo é apagado do Redis antes de emitir o novo par — nunca reemitir sem invalidar o anterior.
- Mensagens de erro de login idênticas para email inexistente e password errada (`"Invalid email or password"`) — evita enumeração de contas.

## Input Validation

Zod em cada módulo (`*.validators.ts`), aplicado antes de chegar ao service. Erros de validação (`ZodError`) são apanhados centralmente por `middleware/errorHandler.ts` e devolvidos como 400 com a lista de campos inválidos — nunca deixar passar input não validado para queries Knex.

## Queries à base de dados

Sempre via Knex query builder (`db('tabela').where(...)`, `.insert(...)`) — nunca concatenar strings SQL com valores vindos de request. Se algum dia for necessário `knex.raw`, os valores têm de ir como bindings (`knex.raw('... ?', [valor])`), nunca interpolados na string.

## CORS

Restrito à origem configurada em `CORS_ORIGIN` (`app.ts`), com métodos e headers explícitos (`Content-Type`, `Authorization`). Em desenvolvimento aponta para `http://localhost:5173` por default; em produção deve apontar exatamente para o domínio do frontend implantado.

## Rate Limiting

`express-rate-limit` aplicado globalmente em `app.ts`, configurável via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` (defaults: 15 min / 100 pedidos). Protege contra abuso básico por IP — considerar limites mais apertados especificamente em `/api/auth/login` e `/api/auth/register` se o abuso for direcionado a essas rotas.

## Headers de segurança

`helmet()` aplicado globalmente em `app.ts` antes de qualquer rota — mantém os defaults do Helmet salvo justificação explícita para desativar algum.

## Error Handling (ver também architecture.md)

`middleware/errorHandler.ts` nunca expõe stack traces ou mensagens internas em produção (`NODE_ENV !== 'development'`) — resposta genérica ao cliente, detalhe completo só no `console.error` do servidor.

## Socket.io

Ligações autenticadas em `sockets/middleware/socketAuth.ts` antes de entrarem em qualquer room — mesma verificação de JWT que as rotas HTTP, não um mecanismo paralelo mais fraco.

## Logging

Nunca logar passwords, tokens (access/refresh), ou o conteúdo de `Authorization`. Logs de erro incluem contexto da operação, nunca o payload de autenticação em bruto.

## Dependency Updates

`npm audit` regularmente em `backend/` e `frontend/`. Atualizar quando há patches de segurança, sem adiar por conveniência.
