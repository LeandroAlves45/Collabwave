// ============================================================
// Migration: 003_create_workspace_members
// ============================================================
// Cria a tabela de associação "workspace_members".
// Implementa a relação muitos-para-muitos entre users e workspaces,
// com um campo "role" adicional (owner | admin | member).
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspace_members', (table) => {
    // Chave composta
    // Combinação  workspace_id + user_id deve ser única
    table
      .uuid('workspace_id')
      .notNullable()
      .references('id')
      .inTable('workspaces')
      // Se o workspace for apagado, remove as associações
      .onDelete('CASCADE');

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      // Se o usuário for apagado, remove as associações
      .onDelete('CASCADE');

    // PRIMARY KEY COMPOSTA
    table.primary(['workspace_id', 'user_id']);

    // Role do membro no workspace
    // Valores possíveis: 'owner', 'admin', 'member'
    table.string('role', 20).notNullable().defaultTo('member');

    // Quando o utilizador se juntou ao workspace
    table.timestamp('joined_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_members');
}
