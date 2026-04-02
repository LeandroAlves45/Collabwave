import knex from 'knex';
import { env } from './env';

// INSTÂNCIA DO KNEX
const db = knex({
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },

  // CONNECTION POOL
  pool: {
    min: 2,
    max: 10,
  },

  // MIGRATIONS
  migrations: {
    directory: './migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },

  // DEBUG
  debug: env.NODE_ENV === 'development',
});

export default db;
