import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Incluir tanto src/ (para specs) quanto tests/ (para test files)
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts', '**/src/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tests/tsconfig.json',
        // Usar CommonJS para compatibilidade com jest.mock
        useESM: false,
      },
    ],
  },

  // Executado antes de cada file de testes -> define envs mínimas
  setupFiles: ['<rootDir>/tests/setup.ts'],

  // Resolve imports TypeScript com extensão .js
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Cobertura de código
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  coverageReporters: ['text', 'lcov'],
};

export default config;
