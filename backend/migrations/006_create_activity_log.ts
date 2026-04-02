// ============================================================
// Migration: 006_create_activity_log
// ============================================================
// Cria a tabela "activity_log" — registo de todas as acções
// realizadas num workspace (task criada, movida, atribuída, etc.)
//
// O campo metadata é JSONB — permite armazenar dados estruturados
// variáveis sem precisar de colunas fixas para cada tipo de evento.
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Workspace onde a acção ocorreu
    table
      .uuid('workspace_id')
      .notNullable()
      .references('id')
      .inTable('workspaces')
      .onDelete('CASCADE');

    // Utilizador que realizou a acção
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      // SET NULL preserva o log mesmo que o utilizador seja eliminado
      .onDelete('SET NULL');

    // Tipo de evento (e.g., "task_created", "task_moved", "member.joined")
    table.string('action', 50).notNullable();

    // Dados adicionais da ação em formato JSON
    table.jsonb('metadata').notNullable();

    // Quando a acção ocorreu
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    // Índice de perfomance
    table.index(
      ['workspace_id', 'created_at'],
      'idx_activity_log_workspace_created',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_log');
}
