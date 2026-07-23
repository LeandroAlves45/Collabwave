---
name: postgres-ef-core-best-practices
description: Boas práticas de performance e desenho de PostgreSQL aplicadas via Entity Framework Core. Usar ao escrever ou rever queries LINQ, desenhar entidades/migrations, ou investigar problemas de performance na base de dados do Chatbot.
metadata:
  version: "1.0.0"
  project: Chatbot
  abstract: Guia de otimização PostgreSQL para o stack Chatbot (.NET 10 + EF Core), focado nas 3 entidades reais do projeto (Users, Conversations, Messages). Cobre índices, N+1, migrations e connection pooling via Npgsql.
---

# PostgreSQL + EF Core Best Practices

Guia de performance e boas práticas de PostgreSQL aplicado através do Entity Framework Core, para o stack real do Chatbot (sem Supabase, sem multi-tenant, sem RLS).

## Quando Aplicar

- Escrever ou rever queries LINQ que o EF Core traduz para SQL
- Desenhar entidades, relações ou migrations em `backend/Infrastructure`
- Investigar lentidão em listagem de conversas ou histórico de mensagens
- Configurar o `DbContext` ou o connection pooling do Npgsql

## Áreas Prioritárias

| Prioridade | Área | Foco no Chatbot |
|---|---|---|
| 1 | N+1 queries | `Include`/`ThenInclude` ao carregar Conversations + Messages |
| 2 | Índices | `user_id` em Conversations, `conversation_id` e `created_at` em Messages |
| 3 | Connection pooling | Npgsql pooling (`Maximum Pool Size` na connection string) |
| 4 | Migrations | Uma migration por alteração de schema, nunca editar uma já aplicada |
| 5 | Paginação | Histórico de mensagens não deve carregar tudo de uma vez |

## Regras Práticas

### Evitar N+1
Ao carregar conversas com as suas mensagens, usar `Include` explícito em vez de lazy loading implícito:

```csharp
var conversations = await context.Conversations
    .Include(c => c.Messages)
    .Where(c => c.UserId == userId)
    .ToListAsync();
```

Se a coleção crescer (muitas mensagens por conversa), preferir `AsSplitQuery()` para evitar um único JOIN gigante:

```csharp
var conversations = await context.Conversations
    .Include(c => c.Messages)
    .AsSplitQuery()
    .Where(c => c.UserId == userId)
    .ToListAsync();
```

### Índices
Os índices já definidos em `database-schema.md` (`idx_conversations_user_id`, `idx_messages_conversation_id`, `idx_messages_created_at`) cobrem os padrões de acesso principais: listar conversas de um utilizador, carregar mensagens de uma conversa, ordenar por data. Qualquer nova query frequente que filtre por outra coluna deve ser acompanhada de um índice correspondente na migration.

### Migrations
- Uma migration por alteração lógica de schema (`dotnet ef migrations add NomeDescritivo --project backend/Infrastructure --startup-project backend/WebApi`)
- Nunca editar uma migration já aplicada — criar sempre uma nova
- Rever o SQL gerado (`dotnet ef migrations script`) antes de aplicar em produção

### Connection Pooling
O Npgsql já faz pooling por omissão. Para uma app pessoal de utilizador único, os valores por omissão (`Maximum Pool Size=100`) são mais do que suficientes — não ajustar prematuramente sem sinal real de esgotamento de conexões.

### Paginação
O histórico de mensagens de uma conversa longa não deve ser carregado de uma vez. Usar paginação por cursor (`created_at` + `id`) ou `Skip`/`Take` simples, dado o volume baixo esperado (utilizador único).

## Fora de Âmbito

Row-Level Security (RLS), pooling multi-tenant, e configurações específicas de Supabase não se aplicam — o Chatbot liga diretamente a PostgreSQL (Docker em dev, Neon em produção) via EF Core, sem camada de plataforma intermédia.

## Referências

- https://www.postgresql.org/docs/current/
- https://learn.microsoft.com/ef/core/
- https://www.npgsql.org/doc/index.html
