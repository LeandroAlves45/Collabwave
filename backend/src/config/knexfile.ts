// Config usado pelo CLI do Knex para migrations por ambiente.

import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config: Record<string, Knex.Config> = {
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
      directory: '../../migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    debug: true,
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: '../../migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    debug: false,
  },
};

module.exports = config[process.env.NODE_ENV || 'development'];
