---
name: postgres-knex-best-practices
description: Boas práticas de performance e desenho de PostgreSQL aplicadas via Knex no CollabWave. Usar ao escrever ou rever query builders, desenhar tabelas/migrations, ou investigar problemas de performance na base de dados.
metadata:
  version: "1.0.0"
  project: CollabWave
  abstract: Guia de otimização PostgreSQL para o stack CollabWave (Node 20 + Knex), focado nas entidades reais do projeto (Workspaces, WorkspaceMembers, Columns, Tasks, Users). Cobre índices, N+1, migrations e connection pooling.
---

# PostgreSQL + Knex Best Practices

Guia de performance e boas práticas de PostgreSQL aplicado através do Knex query builder, para o stack real do CollabWave (sem Supabase, sem RLS, sem camada de plataforma intermédia).

## Quando Aplicar

- Escrever ou rever query builders Knex em `backend/src/modules/*/*.service.ts`
- Desenhar tabelas, relações ou migrations em `backend/migrations/*.ts`
- Investigar lentidão em listagem de tarefas de um board ou membros de um workspace
- Configurar a connection pool em `backend/src/config/database.ts` / `backend/src/config/knexfile.ts`

## Áreas Prioritárias

| Prioridade | Área | Foco no CollabWave |
|---|---|---|
| 1 | N+1 queries | `join`/`whereIn` ao carregar Tasks de várias Columns, ou Members de vários Workspaces |
| 2 | Índices | `workspace_id` em Columns e WorkspaceMembers, `column_id` em Tasks, `created_at` para ordenação |
| 3 | Connection pooling | Pool do Knex (`pool.min`/`pool.max` em `knexfile.ts`) |
| 4 | Migrations | Uma migration por alteração de schema, nunca editar uma já aplicada — sempre `npm run migrate:make` |
| 5 | Concorrência | Duas atualizações simultâneas à mesma tarefa (drag-and-drop) não devem gerar updates perdidos silenciosamente |

## Regras Práticas

### Evitar N+1
Ao carregar colunas de um board com as suas tarefas, usar um único `join`/`whereIn` em vez de uma query por coluna:

```typescript
// Errado — N+1: uma query de tasks por cada coluna
const columns = await knex('columns').where({ workspace_id: workspaceId });
for (const column of columns) {
  column.tasks = await knex('tasks').where({ column_id: column.id });
}

// Correto — duas queries no total, independentemente do número de colunas
const columns = await knex('columns').where({ workspace_id: workspaceId });
const columnIds = columns.map((c) => c.id);
const tasks = await knex('tasks').whereIn('column_id', columnIds).orderBy('position');

const tasksByColumn = groupBy(tasks, 'column_id');
columns.forEach((column) => {
  column.tasks = tasksByColumn[column.id] ?? [];
});
```

### Índices
Confirmar que existem índices nas colunas usadas em `WHERE`/`JOIN`/`ORDER BY` mais frequentes: `columns.workspace_id`, `tasks.column_id`, `workspace_members.workspace_id` + `workspace_members.user_id` (idealmente um índice composto, já que a verificação de membership é a query mais repetida do sistema). Qualquer nova query frequente que filtre por outra coluna deve ser acompanhada de um índice correspondente numa migration nova.

### Migrations
- Uma migration por alteração lógica de schema: `npm run migrate:make -- create_task_labels` (nome descritivo, em inglês)
- Nunca editar uma migration já aplicada em `backend/migrations/` — criar sempre uma nova
- Rever o SQL gerado antes de aplicar em produção; migrations que alteram colunas em tabelas com dados devem ter um plano de rollback (`down()`) testado

### Connection Pooling
O Knex faz pooling via `tarn` por omissão. Para o volume esperado do CollabWave (várias equipas pequenas, não tráfego de escala consumer), os valores razoáveis de `pool.min`/`pool.max` em `knexfile.ts` já cobrem a carga esperada — não ajustar prematuramente sem sinal real de esgotamento de conexões (erros de timeout a obter conexão do pool).

### Concorrência em Drag-and-Drop
Duas atualizações simultâneas à mesma tarefa (dois membros a mover a mesma tarefa ao mesmo tempo) devem ser tratadas com uma transação (`knex.transaction`) que lê e escreve a posição/coluna de forma atómica, evitando que a última escrita "vença" silenciosamente sem que o outro membro veja o conflito refletido via Socket.io.

## Fora de Âmbito

Row-Level Security (RLS), pooling multi-tenant, e configurações específicas de Supabase não se aplicam — o CollabWave liga diretamente a PostgreSQL (Docker em dev) via Knex, sem camada de plataforma intermédia.

## Referências

- https://www.postgresql.org/docs/current/
- https://knexjs.org/guide/
