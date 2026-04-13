// ============================================================
// CollabWave — ESLint Flat Config (ESLint v9+)
// ============================================================
// O formato flat config substituiu o .eslintrc.* a partir do
// ESLint v9. Este ficheiro é o equivalente migrado do
// .eslintrc.json anterior.
// ============================================================

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // ----------------------------------------------------------
  // 1. Regras base recomendadas do ESLint
  // ----------------------------------------------------------
  js.configs.recommended,

  // ----------------------------------------------------------
  // 2. Configuração TypeScript
  // ----------------------------------------------------------
  {
    files: ['src/**/*.ts'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        ...globals.node, // process, __dirname, Buffer, setTimeout, etc.
        ...globals.es2021,
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
    },

    rules: {
      // Herdar as regras recomendadas do plugin TypeScript
      ...tsPlugin.configs.recommended.rules,

      // Desactivar a regra base (o plugin TS tem a sua própria versão)
      'no-unused-vars': 'off',

      // Variáveis não usadas são erro, excepto as prefixadas com _
      // Útil para parâmetros como (_req, res, next) em middlewares Express
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',      // parâmetros de função: (_req, _next, ...)
          varsIgnorePattern: '^_',      // variáveis locais: ({ password_hash: _password_hash, ... })
          caughtErrorsIgnorePattern: '^_', // catch (_err) { ... }
        },
      ],

      // any explícito é aviso — idealmente evitar, mas permitido em casos pontuais
      '@typescript-eslint/no-explicit-any': 'warn',

      // Desactivado — Express 5 trata promises automaticamente
      '@typescript-eslint/no-floating-promises': 'off',

      // require() em TypeScript é aviso — preferir import/export
      '@typescript-eslint/no-var-requires': 'warn',
    },
  },

  // ----------------------------------------------------------
  // 3. Ficheiros e pastas ignoradas
  // ----------------------------------------------------------
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
