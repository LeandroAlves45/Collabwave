import type { Knex } from 'knex';

interface DuplicatePosition {
  scope_id: string;
  position: number;
  duplicate_count: string;
}

async function assertNoDuplicatePositions(knex: Knex): Promise<void> {
  const duplicateColumns = await knex<DuplicatePosition>('columns')
    .select('workspace_id as scope_id', 'position')
    .count('* as duplicate_count')
    .groupBy('workspace_id', 'position')
    .havingRaw('count(*) > 1');

  const duplicateTasks = await knex<DuplicatePosition>('tasks')
    .select('column_id as scope_id', 'position')
    .count('* as duplicate_count')
    .groupBy('column_id', 'position')
    .havingRaw('count(*) > 1');

  if (duplicateColumns.length || duplicateTasks.length) {
    throw new Error(
      `Migration 008 aborted: duplicate positions detected. ` +
        `columns=${JSON.stringify(duplicateColumns)}, ` +
        `tasks=${JSON.stringify(duplicateTasks)}. ` +
        'Resolve the conflicting rows explicitly before retrying.',
    );
  }
}

export async function up(knex: Knex): Promise<void> {
  await assertNoDuplicatePositions(knex);

  await knex.raw(
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_foreign',
  );
  await knex.raw(
    `ALTER TABLE tasks
     ADD CONSTRAINT tasks_created_by_foreign
     FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`,
  );
  await knex.raw(
    `ALTER TABLE workspace_members
     ADD CONSTRAINT workspace_members_role_check
     CHECK (role IN ('owner', 'admin', 'member'))`,
  );
  await knex.raw(
    `ALTER TABLE tasks
     ADD CONSTRAINT tasks_priority_check
     CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`,
  );

  // DEFERRABLE permite deslocar várias posições na mesma transação sem uma
  // colisão temporária invalidar um estado final que é único.
  await knex.raw(
    `ALTER TABLE columns
     ADD CONSTRAINT columns_workspace_position_unique
     UNIQUE (workspace_id, position) DEFERRABLE INITIALLY DEFERRED`,
  );
  await knex.raw(
    `ALTER TABLE tasks
     ADD CONSTRAINT tasks_column_position_unique
     UNIQUE (column_id, position) DEFERRABLE INITIALLY DEFERRED`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_column_position_unique',
  );
  await knex.raw(
    'ALTER TABLE columns DROP CONSTRAINT IF EXISTS columns_workspace_position_unique',
  );
  await knex.raw(
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check',
  );
  await knex.raw(
    'ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check',
  );
  await knex.raw(
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_foreign',
  );
  await knex.raw(
    `ALTER TABLE tasks
     ADD CONSTRAINT tasks_created_by_foreign
     FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`,
  );
}
