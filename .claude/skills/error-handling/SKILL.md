---
name: error-handling
description: Expert em tratamento de erros no backend Express do CollabWave (AppError + errorHandler global) e em comunicação de falhas de eventos Socket.io ao frontend. Garante que exceções nunca são usadas para fluxo normal e que falhas em tempo real são comunicadas de forma clara ao utilizador.
color: blue
emoji: 📦
---

# Error Handling Specialist

Especialista em tratamento de erros tipado no CollabWave: `AppError` + `errorHandler` global no backend Express (`backend/src/middleware/errorHandler.ts`), e comunicação de falhas de eventos Socket.io no frontend (React/TypeScript).

## Core Mission

### AppError na camada de serviço

- Toda a lógica de negócio que pode falhar de forma esperada lança `AppError(message, statusCode)` — nunca `Error("something went wrong")` genérico
- Exceções nativas (`Error`) ficam reservadas para erros verdadeiramente inesperados (bugs, falhas de infraestrutura) — capturadas pelo `errorHandler` no ramo genérico
- Casos de falha esperados (email já existe, credenciais inválidas, recurso não encontrado) são sempre `AppError` com o status code já definido na origem

### Mapeamento de erros → HTTP (via `errorHandler.ts`)

- `ZodError` (falha de validação) → 400 com `{ status: 'error', message, errors: [{ field, message }] }`
- `AppError` → status code definido na criação do erro (409 email duplicado, 401 credenciais inválidas, 404 não encontrado, etc.)
- Qualquer outro erro → 500, mensagem genérica em produção (`NODE_ENV !== 'development'`), mensagem real só em desenvolvimento; sempre logado com `console.error` no servidor

### Eventos Socket.io — comunicar falhas explicitamente

- Uma ligação Socket.io que falha a autenticação (`sockets/middleware/socketAuth.ts`) deve rejeitar explicitamente, nunca deixar o cliente pendurado sem feedback
- Um handler (`sockets/handlers/*.ts`) que falhe a processar um evento (ex: mover task para coluna inexistente) deve emitir um evento de erro de volta ao remetente, não falhar em silêncio nem derrubar a ligação
- O frontend (`services/socket.ts`) deve distinguir: evento aplicado com sucesso, evento rejeitado pelo servidor (erro de negócio), ligação perdida (erro de rede/reconexão)

### Nunca Engolir Erros

- Toda a falha é logada com contexto (operação, IDs relevantes) antes de ser devolvida ao chamador
- Nunca `catch` vazio ou `catch` que só re-lança sem contexto adicional — a exceção documentada é `auth.services.ts#logout`, onde o catch vazio é intencional (logout é idempotente do ponto de vista do cliente) e está comentado como tal

## Critical Rules

### Nunca Expor Detalhes Internos

- Stack traces, connection strings, ou mensagens de erro cruas do Postgres/Redis nunca chegam ao frontend em produção
- Mensagens de erro para o utilizador são sempre claras e acionáveis ("Email ou password inválidos" em vez do erro técnico do bcrypt/jwt)

### AppError é Explícito

- Um service que pode falhar de forma esperada lança `AppError` com status code correto — nunca deixar o controller adivinhar o status a partir do tipo de erro
- O `errorHandler` é sempre o último middleware registado em `app.ts` — qualquer rota nova adicionada depois dele nunca terá os seus erros tratados corretamente

### Retry Apenas em Erros Transitórios

- Falhas de ligação ao Redis/Postgres por timeout de rede: retry com backoff exponencial ao nível da infraestrutura, não ao nível do request individual
- Erros de validação (Zod) ou `AppError` de negócio: falhar imediatamente, nunca retry — repetir o mesmo pedido inválido não o torna válido

## Exemplo — AppError num service (padrão real do projeto)

```typescript
// auth.services.ts — padrão já usado no projeto
if (existingUser) {
  throw new AppError("An account with this email already exists", 409);
}
```

## Exemplo — tratamento de erro num handler Socket.io

```typescript
// sockets/handlers/task.handler.ts
socket.on("task:move", async (payload) => {
  try {
    const task = await moveTask(payload);
    io.to(`workspace:${task.workspaceId}`).emit("task:moved", task);
  } catch (err) {
    if (err instanceof AppError) {
      socket.emit("task:move_error", { message: err.message });
      return;
    }
    console.error("Unexpected error moving task:", err);
    socket.emit("task:move_error", {
      message: "Não foi possível mover a task.",
    });
  }
});
```

## Exemplo — distinguir falhas no frontend (`services/socket.ts`)

```typescript
socket.on("task:move_error", (payload) => {
  showToast(payload.message); // erro de negócio, mensagem específica do servidor
});

socket.on("disconnect", () => {
  showConnectionLostIndicator(); // erro de rede/ligação, tratado separadamente
});
```

## Workflow

1. Identificar se a falha é esperada (negócio) ou inesperada (bug/infraestrutura)
2. Modelar falhas esperadas como `AppError` com status code correto (HTTP) ou evento de erro explícito (Socket.io)
3. Confirmar que `errorHandler.ts` está registado como último middleware e cobre o novo caso
4. No frontend, garantir que eventos de erro de socket e desconexões de rede são tratados de forma distinta
5. Testar os caminhos de falha (não só o caminho feliz) — ver skill de testing
