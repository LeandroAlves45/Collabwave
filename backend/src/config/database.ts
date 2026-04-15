import knex from 'knex';
import { env } from './env';

const db = knex({
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },

  pool: {
    min: 2,
    max: 10,
  },

  migrations: {
    directory: './migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },

  debug: env.NODE_ENV === 'development',
});

export default db;
