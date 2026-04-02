// ============================================================
// CollabWave — Knex Configuration File
// ============================================================
// Este ficheiro é usado pelo CLI do Knex para correr migrações.
// Referenciado nos scripts do package.json:
//   "migrate": "knex migrate:latest --knexfile src/config/knexfile.ts"
//
// Define configurações por ambiente (development, production)
// para que as migrações funcionem correctamente em cada contexto.
// ============================================================

import type { Knex } from 'knex';
import 'dotenv/config';

// CONFIGURAÇÕES POR AMBIENTE
const config: Record<string, Knex.Config> = {
  // AMBIENTE DE DESENVOLVIMENTO
  development: {
    client: 'pg',
    connection: {
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://collabwave_user:your_password@localhost:5432/collabwave',
      ssl: false,
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    debug: true,
  },

  // AMBIENTE DE PRODUÇÃO
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    debug: false,
  },
};

// EXPORT
module.exports = config[process.env.NODE_ENV || 'development'];
