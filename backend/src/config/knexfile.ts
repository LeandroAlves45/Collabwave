// Config usado pelo CLI do Knex para executar migrations por ambiente.
// Este arquivo e carregado por comandos como `knex migrate:latest`.

import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Carrega o .env da raiz do backend/projeto mesmo quando o comando do Knex e
// executado a partir de outro diretorio.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: {
      // Mantem uma URL local de fallback para facilitar setup inicial em dev.
      // Em ambientes reais, DATABASE_URL deve vir do .env ou do provedor.
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://collabwave_user:your_password@localhost:5432/collabwave',
      ssl: false,
    },
    pool: { min: 2, max: 10 },
    migrations: {
      // Caminho relativo ao arquivo compilado/executado pelo Knex.
      directory: '../../migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    // Debug em dev mostra as queries geradas, o que ajuda a investigar
    // problemas de migrations e consultas.
    debug: true,
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      // Muitos provedores Postgres gerenciados exigem SSL. rejectUnauthorized
      // false evita falhas quando o certificado do provedor nao esta na cadeia
      // local de confianca.
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

// O Knex espera exportacao CommonJS neste arquivo de configuracao.
module.exports = config[process.env.NODE_ENV || 'development'];
