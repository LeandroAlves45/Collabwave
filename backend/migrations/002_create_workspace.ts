// ============================================================
// Migration: 002_create_workspaces
// ============================================================
// Cria a tabela "workspaces".
// Depende de "users" (owner_id é FK para users.id).
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Nome do workspace
    table.string('name', 100).notNullable();

    // Descrição do workspace
    table.text('description').nullable();

    // Dono do workspace (FK para users.id)
    table
      .uuid('owner_id')
      .notNullable()
      .references('id')
      .inTable('users')
      // ON DELETE RESTRICT impede que um utilizador seja eliminado enquanto tiver workspaces
      .onDelete('RESTRICT');

    // Código de convite único - partilhado para permitir que outros se juntem
    table.string('invite_code', 12).notNullable().unique();

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspaces');
}
