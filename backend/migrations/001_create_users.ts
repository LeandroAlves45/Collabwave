// ============================================================
// Migration: 001_create_users
// ============================================================
// Cria a tabela "users" - entidade base de toda a aplicação.
// Todos os outros recursos (workspaces, tasks, etc.) pertencem
// a um utilizador.
// ============================================================

import type { Knex } from 'knex';

// ------------------------------------------------------------
// UP - aplica a migração
// ------------------------------------------------------------

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // PRIMARY KEY
    // UUID gerado automaticamente para garantir unicidade e segurança
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Nome de exibição do utilizador
    table.string('name', 100).notNullable();

    // Email único,  usado para login
    table.string('email', 255).notNullable().unique();

    // Hash da password (bcryptjs)
    table.string('password_hash', 255).notNullable();

    // URL do avatar (opcional — utilizador pode não ter foto de perfil)
    table.string('avatar_url').nullable();

    // Timestamp de criação
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

// ------------------------------------------------------------
// DOWN - reverte a migração
// ------------------------------------------------------------
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
