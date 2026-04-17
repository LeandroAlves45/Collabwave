import dotenv from 'dotenv';
import path from 'path';

// Carrega variaveis do arquivo .env antes de montar o objeto de configuracao.
// O caminho sobe ate a raiz onde o .env do projeto deve estar.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Para variaveis obrigatorias, falhar cedo deixa o erro claro no arranque da
// aplicacao em vez de causar falhas mais dificeis de rastrear depois.
function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

// Para variaveis opcionais, centralizamos o fallback aqui. Assim o restante do
// codigo consome `env` sem repetir verificacoes de string vazia.
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

// Objeto unico de configuracao da aplicacao. Concentrar os valores aqui evita
// espalhar `process.env` por varios modulos e facilita testes/manutencao.
export const env = {
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),

  // Porta HTTP usada pelo servidor Express.
  PORT: parseInt(getOptionalEnv('PORT', '3000'), 10),

  // URLs de infraestrutura obrigatorias: sem banco ou Redis a API nao deve
  // iniciar em modo normal.
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),

  REDIS_URL: getRequiredEnv('REDIS_URL'),

  // Segredos usados para assinar access tokens e refresh tokens. Devem ser
  // diferentes entre si e nunca versionados no repositorio.
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Origem autorizada para chamadas do frontend no middleware de CORS.
  CORS_ORIGIN: getOptionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // Configuracao do rate limit: janela de tempo em ms e numero maximo de
  // pedidos permitidos dentro dessa janela.
  RATE_LIMIT_WINDOW_MS: parseInt(
    getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000'),
    10,
  ),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'),
    10,
  ),
} as const;

export type Env = typeof env;
