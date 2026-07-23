# Database Schema

PostgreSQL, migrations Knex em `backend/migrations/*.ts`, config em `backend/src/config/knexfile.ts`. Todas as PKs são UUID (`gen_random_uuid()`), tabelas principais têm `created_at` com timezone.

## Entity Relationship Diagram

```
users
  id (PK, uuid)
  name
  email (unique)
  password_hash
  avatar_url (nullable)
  created_at

workspaces
  id (PK, uuid)
  name
  description (nullable)
  owner_id (FK -> users.id, ON DELETE RESTRICT)
  invite_code (unique)
  created_at

workspace_members
  workspace_id (FK -> workspaces.id, ON DELETE CASCADE)   \ PK composta
  user_id (FK -> users.id, ON DELETE CASCADE)             /
  role ('owner' | 'admin' | 'member', default 'member')
  joined_at

columns
  id (PK, uuid)
  workspace_id (FK -> workspaces.id, ON DELETE CASCADE)
  title
  position (int, ordem no quadro)
  índice: (workspace_id, position)

tasks
  id (PK, uuid)
  column_id (FK -> columns.id, ON DELETE CASCADE)
  title
  description (nullable)
  assignee_id (FK -> users.id, nullable, ON DELETE SET NULL)
  created_by (FK -> users.id, ON DELETE SET NULL)   -- adicionado na migration 007
  priority ('low' | 'medium' | 'high' | 'urgent', default 'medium')
  due_date (nullable)
  position (int, ordem dentro da coluna)
  created_at
  updated_at
  índices: (column_id, position), (assignee_id), (created_by)

activity_log
  id (PK, uuid)
  workspace_id (FK -> workspaces.id, ON DELETE CASCADE)
  user_id (FK -> users.id, nullable, ON DELETE SET NULL)
  action (string, ex: "task_created", "task_moved", "member.joined")
  metadata (jsonb, nullable — payload variável por tipo de evento)
  created_at
  índice: (workspace_id, created_at)
```

## Relacionamentos

- Um `user` pode ser dono (`owner_id`) de vários `workspaces` e/ou membro de vários via `workspace_members` (muitos-para-muitos com `role`).
- Um `workspace` tem várias `columns`; cada `column` tem várias `tasks`.
- Uma `task` pertence exatamente a uma `column`; pode ter um `assignee` (nullable) e tem sempre um `created_by`.
- `activity_log` regista ações por workspace, independente da entidade afetada especificamente (usa `metadata` jsonb para detalhe).

## Migrations existentes (ordem de aplicação)

1. `001_create_users`
2. `002_create_workspace`
3. `003_create_workspace_menbers` (nome do ficheiro tem erro de digitação — não corrigir o nome do ficheiro já aplicado, só ter atenção ao criar novas migrations relacionadas)
4. `004_create_column`
5. `005_create_tasks`
6. `006_create_activity_log`
7. `007_add_created_by_to_tasks` (alteração em `tasks`, com backfill seguro: adiciona coluna nullable, faz backfill, só depois aplica `NOT NULL` + FK)

## Convenções

- Nunca editar uma migration já aplicada (001–007) — criar sempre uma nova via `npm run migrate:make` (a partir de `backend/`).
- Alterações a colunas `NOT NULL` em tabelas com dados existentes seguem o padrão da migration 007: adicionar nullable → backfill → alterar para `NOT NULL` + índices/FK.
- Índices de suporte a queries de listagem (por posição, por workspace, por assignee) vivem na própria migration da tabela, não misturados com alterações de schema não relacionadas.
- `ON DELETE` é escolhido por semântica: `CASCADE` quando o filho não faz sentido sem o pai (colunas de um workspace, tasks de uma coluna), `SET NULL` quando o histórico deve sobreviver (assignee, created_by, activity_log.user_id), `RESTRICT` quando eliminar o pai deveria ser bloqueado explicitamente (dono de um workspace).
