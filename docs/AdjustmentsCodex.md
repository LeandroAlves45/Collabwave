# AdjustmentsCodex

## Sprint 2 - Ajustes pendentes apos code review

Data da revisao: 2026-04-15

Este documento regista os ajustes que ainda faltam depois da nova revisao da Sprint 2. O foco principal continua a ser a fundacao WebSocket definida no documento SDLC:

- Socket.io server setup.
- JWT handshake middleware.
- Workspace rooms.
- Presence system with Redis.

Estado atual: a suite de testes melhorou bastante e ja passa em modo serial com cobertura global acima dos thresholds configurados. Ainda assim, ha alguns pontos que devem ser corrigidos antes de considerar a Sprint 2 completamente fechada.

## Resumo Atual

Comando validado:

```bash
npx jest --ci --coverage --forceExit --runInBand
```

Resultado observado:

```txt
Test Suites: 8 passed, 8 total
Tests: 104 passed, 104 total
Statements: 72.27%
Branches: 63.35%
Functions: 62.74%
Lines: 72.81%
```

Isto resolve o problema anterior de coverage abaixo de 60%. A suite passa, mas ainda existem logs e erros internos escondidos por `catch`, especialmente na camada de WebSocket/presenca.

## Ajustes Pendentes

### 1. Corrigir cleanup de presenca no evento `disconnect`

Prioridade: Alta

Ficheiros envolvidos:

- `backend/src/sockets/handlers/workspace.handler.ts`
- `backend/tests/integration/socket.test.ts`

Problema:

Durante os testes WebSocket continua a aparecer o erro:

```txt
TypeError: affectedWorkspacesIds is not iterable
```

O erro acontece no handler de `disconnect`, quando este codigo tenta iterar o resultado de `removeUserFromAllWorkspaces(user.id)`:

```ts
const affectedWorkspacesIds = await removeUserFromAllWorkspaces(user.id);

for (const workspaceId of affectedWorkspacesIds) {
  ...
}
```

Nos testes, `jest.clearAllMocks()` limpa os mocks antes de cada caso, mas `mockPresence.removeUserFromAllWorkspaces` nao volta a receber um valor default. Assim, quando o socket faz `disconnect`, a funcao mockada devolve `undefined`, e o `for...of` quebra.

Impacto:

- Os testes passam porque o erro e apanhado pelo `catch`.
- Mas o comportamento real de cleanup nao esta validado.
- O requisito FR-31, remover o membro da presence list no disconnect, fica pouco confiavel.

Ajuste recomendado:

No `beforeEach` de `socket.test.ts`, definir defaults seguros para os mocks de presenca:

```ts
beforeEach(() => {
  jest.clearAllMocks();

  mockPresence.addUserToPresence.mockResolvedValue(undefined);
  mockPresence.removeUserFromPresence.mockResolvedValue(undefined);
  mockPresence.removeUserFromAllWorkspaces.mockResolvedValue([]);
  mockPresence.getOnlineUsers.mockResolvedValue([]);
});
```

Depois, adicionar pelo menos um teste especifico para `disconnect`:

```ts
it('cleans presence on disconnect and broadcasts presence_update', async () => {
  mockPresence.removeUserFromAllWorkspaces.mockResolvedValue(['ws-test-1']);
  mockPresence.getOnlineUsers.mockResolvedValue([]);

  const socket = await connectClient(makeToken());
  socket.disconnect();

  await waitForCondition(() =>
    expect(mockPresence.removeUserFromAllWorkspaces).toHaveBeenCalledWith('user-1'),
  );
});
```

Nota: o exemplo acima pode precisar de um helper `waitForCondition`, porque `disconnect` e assincromo e nao devolve uma Promise ao cliente.

Resultado esperado:

- O erro `affectedWorkspacesIds is not iterable` desaparece.
- O cleanup de presenca fica testado diretamente.
- FR-31 fica mais bem coberto.

### 2. Corrigir modelacao de presenca para suportar multiplas tabs por utilizador

Prioridade: Alta

Ficheiros envolvidos:

- `backend/src/sockets/presence.service.ts`
- `backend/src/sockets/handlers/workspace.handler.ts`

Problema:

A presenca atual guarda apenas `userId` num Redis Set por workspace:

```txt
presence:{workspaceId} -> { user-1, user-2 }
```

Isto funciona para uma conexao por utilizador, mas falha quando o mesmo user abre duas tabs ou dois browsers. Se uma tab fecha, o `disconnect` remove o `userId` inteiro da presence list, mesmo que a outra tab continue ligada.

Impacto:

- A lista de membros online pode ficar incorreta.
- O user pode desaparecer da presence bar apesar de ainda estar conectado.
- Isto afeta diretamente FR-30 e FR-31.

Ajuste recomendado:

Trocar a presenca para ser baseada em sockets ativos, ou manter uma contagem por utilizador.

Opcao recomendada: Redis Hash por workspace:

```txt
presence:{workspaceId} -> hash
  user-1 -> 2
  user-2 -> 1
```

Fluxo:

- Ao entrar no workspace: `HINCRBY presence:{workspaceId} userId 1`
- Ao sair/desconectar: `HINCRBY presence:{workspaceId} userId -1`
- Se a contagem chegar a `0`, remover o campo com `HDEL`.
- `getOnlineUsers` deve ler os `HKEYS` em vez de `SMEMBERS`.

Alternativa:

Guardar pares `userId:socketId` num Set:

```txt
presence:{workspaceId} -> { user-1:socket-a, user-1:socket-b }
```

Depois, `getOnlineUsers` deduplica por `userId`.

Resultado esperado:

- Fechar uma tab nao remove o utilizador se outra tab ainda estiver online.
- A lista de presenca passa a representar conexoes reais.
- A implementacao fica alinhada com cenarios reais de uso.

### 3. Isolar Redis nos testes para evitar conexoes reais e handles abertos

Prioridade: Media

Ficheiros envolvidos:

- `backend/src/config/redis.ts`
- `backend/tests/integration/socket.test.ts`
- `backend/tests/setup.ts`

Problema:

Mesmo com `jest.mock('../../src/config/redis.js')`, os testes continuam a imprimir logs reais de Redis:

```txt
[REDIS] Connection error:
[REDIS] Reconnecting...
Cannot log after tests are done
```

Isto indica que o modulo real de Redis esta a ser inicializado em algum ponto da suite.

Impacto:

- A suite fica ruidosa.
- Podem ficar handles abertos depois dos testes.
- O `--forceExit` mascara o problema.
- Testes de WebSocket ficam dependentes de comportamento externo que devia estar mockado.

Ajuste recomendado:

Criar um mock manual para `src/config/redis` que nunca instancia `ioredis`.

Exemplo de mock:

```ts
const redisMock = {
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  sismember: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  duplicate: jest.fn(),
};

redisMock.duplicate.mockReturnValue(redisMock);

export const redisClient = redisMock;
export const pubClient = redisMock;
export const subClient = redisMock;
```

Tambem e possivel tornar `redis.ts` mais testavel:

```ts
const lazyConnect = env.NODE_ENV === 'test';

export const redisClient = new Redis(env.REDIS_URL, {
  ...redisOptions,
  lazyConnect,
});
```

Resultado esperado:

- Sem logs de Redis real durante testes.
- Menos necessidade de `--forceExit`.
- Suite mais estavel em CI.

### 4. Fortalecer os testes de `column.service`

Prioridade: Media

Ficheiros envolvidos:

- `backend/tests/unit/column.service.test.ts`
- `backend/src/modules/columns/column.service.ts`

Problema:

Os novos testes aumentaram bastante a cobertura de `column.service.ts`, mas alguns casos ainda validam apenas o resultado final e nao a operacao interna esperada.

Exemplo:

- O teste "moves column right: decrements intermediate columns" deve confirmar que `decrement` foi chamado nos registos certos.
- O teste "moves column left: increments intermediate columns" deve confirmar que `increment` foi chamado nos registos certos.

Impacto:

- A cobertura numerica esta boa.
- Mas ainda e possivel quebrar a reordenacao interna sem o teste falhar.
- FR-26, persistencia da ordem das colunas, fica parcialmente validado.

Ajuste recomendado:

Nos mocks de transacao, separar os query builders usados para:

- Atualizar colunas intermediarias.
- Atualizar a coluna movida.

Depois, validar:

```ts
expect(intermediateQb.where).toHaveBeenCalledWith('workspace_id', 'ws-1');
expect(intermediateQb.andWhere).toHaveBeenCalled();
expect(intermediateQb.decrement).toHaveBeenCalledWith('position', 1);
```

Para mover para a esquerda:

```ts
expect(intermediateQb.increment).toHaveBeenCalledWith('position', 1);
```

Resultado esperado:

- Os testes deixam de validar apenas "voltou position X".
- Passam a validar a regra de negocio da reordenacao.
- Maior confianca em FR-26.

### 5. Alinhar o requisito FR-06 com a implementacao de handshake

Prioridade: Baixa / Media

Ficheiros envolvidos:

- `backend/src/sockets/middleware/socketAuth.ts`
- Documento SDLC

Problema:

O SDLC diz que a conexao WebSocket deve autenticar via token na handshake query. A implementacao atual usa:

```ts
socket.handshake.auth?.token
```

Isto e normal em Socket.io moderno e geralmente melhor do que query string, mas nao cumpre literalmente o texto do requisito.

Impacto:

- Em code review, pode parecer incumprimento de FR-06.
- A implementacao pode estar correta tecnicamente, mas a documentacao e o codigo estao desalinhados.

Ajuste recomendado:

Escolher uma das opcoes:

1. Atualizar o SDLC para dizer "handshake auth".
2. Suportar os dois formatos:

```ts
const rawToken =
  socket.handshake.auth?.token ??
  socket.handshake.query?.token;
```

Resultado esperado:

- Requisito e codigo ficam alinhados.
- Clientes podem autenticar de forma previsivel.

### 6. Melhorar testes de presence service com Redis mockado

Prioridade: Media

Ficheiros envolvidos:

- `backend/src/sockets/presence.service.ts`
- Novo ficheiro sugerido: `backend/tests/unit/presence.service.test.ts`

Problema:

`presence.service.ts` continua com cobertura baixa e e uma peca central da Sprint 2. Hoje, a maior parte da validacao acontece indiretamente via `socket.test.ts`.

Impacto:

- Bugs de Redis keys, TTL, remocao e leitura podem passar despercebidos.
- FR-30, FR-31 e FR-33 dependem diretamente deste service.

Ajuste recomendado:

Criar testes unitarios para:

- `addUserToPresence` chama Redis com a chave correta.
- `addUserToPresence` renova TTL.
- `removeUserFromPresence` remove o user correto.
- `getOnlineUsers` devolve `[]` quando Redis nao tem ids.
- `getOnlineUsers` busca dados dos users quando Redis devolve ids.
- `removeUserFromAllWorkspaces` remove o user de todas as chaves onde ele esta presente.

Resultado esperado:

- Maior confianca na camada Redis.
- Melhor cobertura real da Sprint 2.
- Menos dependencia de testes WebSocket longos.

## Checklist de Conclusao

Antes de fechar a Sprint 2, validar:

- [ ] `socket.test.ts` nao imprime `affectedWorkspacesIds is not iterable`.
- [ ] `socket.test.ts` nao tenta reconectar ao Redis real.
- [ ] `disconnect` tem teste especifico para cleanup de presenca.
- [ ] Presenca suporta multiplas conexoes por utilizador.
- [ ] `column.service.test.ts` valida `increment` e `decrement` na reordenacao.
- [ ] FR-06 esta alinhado entre documento e codigo.
- [ ] `presence.service.ts` tem testes unitarios dedicados.
- [ ] `npm run test:ci` passa no ambiente local/CI sem depender de `--forceExit`, se possivel.

## Estado Geral

O projeto melhorou: a cobertura global passou os thresholds e os testes de `column.service` aumentaram muito a confianca no modulo de colunas. O ponto mais importante agora e deixar a camada de presenca realmente solida. Para a Sprint 2, isso e essencial, porque a presenca em Redis e o cleanup no disconnect sao parte central dos requisitos documentados.
