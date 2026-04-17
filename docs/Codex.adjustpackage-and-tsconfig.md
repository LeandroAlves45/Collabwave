# Codex.adjustpackage-and-tsconfig

## Contexto

Durante a conversa apareceram dois grupos de problemas no backend:

1. O comando `npm run dev` falhava com `Cannot find module './config/env.js'`.
2. O VS Code/TypeScript mostrava erros nos testes como `Cannot find name 'jest'`, `Cannot find name 'describe'`, `Cannot find name 'it'` e `Cannot find name 'expect'`.

Os problemas nao eram causados por falta de `dotenv`, `jest`, `ts-jest` ou `@types/jest`. Esses pacotes ja estavam presentes. A causa era configuracao de runtime e de TypeScript.

## Ajuste em `backend/package.json`

O script `dev` foi ajustado para o `nodemon` observar ficheiros TypeScript:

```json
"dev": "nodemon --watch src --ext ts,json --exec \"ts-node --files src/server.ts\""
```

Antes, o `nodemon` arrancava o servidor com `ts-node`, mas so observava extensoes JavaScript/JSON por defeito. Com este ajuste, alteracoes em ficheiros `.ts` dentro de `src` passam a reiniciar o servidor.

## Ajuste em `backend/tsconfig.json`

Foi adicionada a configuracao do `ts-node`:

```json
"ts-node": {
  "experimentalResolver": true
}
```

Isto resolve o problema dos imports com extensao `.js` durante o desenvolvimento.

O codigo TypeScript usa imports como:

```ts
import { env } from './config/env.js';
```

Esse estilo e correto para o output compilado em `dist`, onde o ficheiro final sera `env.js`. Mas em desenvolvimento o ficheiro real e `src/config/env.ts`. O `experimentalResolver` permite ao `ts-node` mapear esse import `.js` para o ficheiro `.ts` correspondente.

## Novo ficheiro `backend/tests/tsconfig.json`

Foi criada uma configuracao TypeScript propria para testes:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "lib": ["es2020", "dom"],
    "rootDir": "..",
    "types": ["node", "jest"]
  },
  "include": ["../src/**/*", "./**/*.ts"],
  "exclude": ["../node_modules", "../dist"]
}
```

Motivo: o `backend/tsconfig.json` principal exclui a pasta `tests`, o que e adequado para o build da aplicacao, mas fazia com que o editor analisasse os testes sem os tipos globais do Jest.

Esta config inclui:

- `types: ["node", "jest"]`, para reconhecer `jest`, `describe`, `it`, `expect`, `beforeEach`, etc.
- `include: ["../src/**/*", "./**/*.ts"]`, para os testes conseguirem importar o codigo de `src`.
- `lib: ["es2020", "dom"]`, porque alguns tipos usados por dependencias de testes, como `socket.io-client`, referenciam APIs como `XMLHttpRequest`.
- `noEmit: true`, porque esta config serve so para type-check dos testes, nao para gerar ficheiros.

## Ajuste em `backend/jest.config.ts`

O `ts-jest` passou a usar a config TypeScript dos testes:

```ts
tsconfig: '<rootDir>/tests/tsconfig.json',
```

Isto separa o build normal do backend da compilacao usada pelo Jest. O build continua a usar `backend/tsconfig.json`, enquanto os testes usam `backend/tests/tsconfig.json`.

## Como validar

Para validar os tipos dos testes:

```bash
npx tsc --project tests/tsconfig.json --noEmit
```

Este comando foi executado e passou sem erros.

Para correr os testes unitarios:

```bash
npm run test:unit
```

Ou, para correr um ficheiro especifico:

```bash
npx jest tests/unit/authenticate.test.ts --runInBand --verbose
```

## Nota sobre o erro seguinte do `dev`

Depois destes ajustes, o erro `Cannot find module './config/env.js'` deixou de ser o bloqueio. O servidor passou a chegar mais longe e falhou depois por infraestrutura local:

```txt
ECONNREFUSED 127.0.0.1:5433
ECONNREFUSED ::1:5433
```

Esse erro significa que a aplicacao tentou ligar ao PostgreSQL na porta `5433`, mas nao havia nenhum servico a responder nessa porta. A correcao nesse caso passa por iniciar o Postgres correto ou ajustar `DATABASE_URL` no `.env`.
