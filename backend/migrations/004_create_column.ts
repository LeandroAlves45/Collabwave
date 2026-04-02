// ============================================================
// Migration: 004_create_columns
// ============================================================
// Cria a tabela "columns" — as colunas do quadro Kanban.
// Cada coluna pertence a um workspace e tem uma posição que
// define a sua ordem de exibição (ex: To Do=0, In Progress=1, Done=2).
// ============================================================

import type { Knex } from 'knex';

export function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('columns', (table) => {
    // PRIMARY KEY
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Workspace a que esta coluna pertence
    table
      .uuid('workspace_id')
      .notNullable()
      .references('id')
      .inTable('workspaces')
      // Se o workspace for apagado, remove as colunas associadas
      .onDelete('CASCADE');

    // Título da coluna (ex: "To Do", "In Progress", "Done")
    table.string('title', 100).notNullable();

    // Posição da coluna no quadro (0, 1, 2, ...)
    // Usado para ordenar as colunas no frontend da esquerda para a direita
    table.integer('position').notNullable();

    // Índice de performance para consultas rápidas por workspace e posição
    table.index(['workspace_id', 'position'], 'idx_columns_workspace_position');
  });
}

export function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('columns');
}
