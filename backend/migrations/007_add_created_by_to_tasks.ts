// ============================================================
// Migration: 007_add_created_by_to_tasks
// ============================================================
// Adiciona campo created_by para rastrear quem criou cada task
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Adiciona coluna sem NOT NULL nem FK
  await knex.schema.alterTable('tasks', (table) => {
    table.uuid('created_by');
  });

  // Step 2: Pega um usuário válido para backfill
  const users = await knex('users').limit(1);
  const defaultUserId = users.length > 0 ? users[0].id : null;

  // Step 3: Atualiza tasks existentes com um usuário válido
  if (defaultUserId) {
    await knex('tasks').whereNull('created_by').update({ created_by: defaultUserId });
  }

  // Step 4: Agora adiciona NOT NULL e FK com segurança
  await knex.schema.alterTable('tasks', (table) => {
    table.uuid('created_by').notNullable().alter();
    table
      .foreign('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.index(['created_by'], 'idx_tasks_created_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tasks', (table) => {
    table.dropIndex(['created_by'], 'idx_tasks_created_by');
    table.dropColumn('created_by');
  });
}
