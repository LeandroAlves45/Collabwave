// ============================================================
// Migration: 005_create_tasks
// ============================================================
// Cria a tabela "tasks" — os cartões do quadro Kanban.
// É a tabela central da aplicação.
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Coluna atual da task - determina em que cluna do Kanban a task está
    table
      .uuid('column_id')
      .notNullable()
      .references('id')
      .inTable('columns')
      // Se a coluna for apagada, remove as tasks associadas
      .onDelete('CASCADE');

    // Título da task
    table.string('title', 255).notNullable();

    // Descrição da task
    table.text('description').nullable();

    // Membro atríbuido a esta task
    table
      .uuid('assignee_id')
      .nullable()
      .references('id')
      .inTable('users')
      // Se o utilizador for apagado, mantém a task mas remove a atribuição do membro
      .onDelete('SET NULL');

    // Prioridade da task - valores possíveis: "low", "medium", "high", "urgent"
    table.string('priority', 20).notNullable().defaultTo('medium');

    // Data de entrega da task
    table.date('due_date').nullable();

    // Posição da task dentro da coluna - determina a ordem das tasks
    table.integer('position').notNullable();

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // Índice de performance das queries que ordenam por posição
    table.index(['column_id', 'position'], 'idx_tasks_column_position');

    // Para encontrar rapidamente as tasks atribuídas a um membro
    table.index(['assignee_id'], 'idx_tasks_assignee');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tasks');
}
