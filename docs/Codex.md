# Codex.md

## Sprint 3 Review - Task Board API e WebSocket Events

Data da revisão: 2026-04-14

Este documento regista os ajustes feitos pelo Codex durante a revisão do Sprint 3 e os problemas encontrados no módulo de tasks/WebSockets. O Sprint 3, segundo a documentação SDLC, cobre:

- REST endpoints para columns e tasks.
- Persistência em PostgreSQL para o quadro Kanban.
- Eventos WebSocket `task:create`, `task:update`, `task:move` e `task:delete`.
- Broadcast dos eventos para a room `workspace:{id}`.

## Ajustes Realizados

### 1. Correção do erro TypeScript no `task.handler.ts`

Erro encontrado:

```txt
TS2349: This expression is not callable.
Type 'typeof import(...)' has no call signatures.
```

O problema vinha de imports dinâmicos do `db` dentro do handler:

```ts
const { default: db } = await import('../../config/database.js');
```

O TypeScript estava a interpretar `db` como o módulo inteiro, e não como a instância callable do Knex. Por isso, chamadas como `db('columns')` eram assinaladas como inválidas.

Solução aplicada:

- Removi a necessidade de consultar diretamente a BD dentro do handler WebSocket.
- O `task.service.ts` passou a devolver também o `workspace_id` quando `updateTask` e `moveTask` são usados.
- O `deleteTask` passou a devolver um pequeno contexto com `taskId` e `workspaceId`, permitindo ao socket emitir o broadcast certo depois da remoção.

Resultado:

- O handler WebSocket deixou de depender diretamente do `db`.
- A camada de service ficou responsável pela lógica de BD.
- O erro TypeScript foi resolvido.

### 2. Alinhamento do nome das rooms Socket.io

Problema encontrado:

- `workspace.handler.ts` usava rooms no formato `workspace:{id}`.
- `task.handler.ts` usava `workspace_{id}`.

Isto faria com que o cliente entrasse numa room, mas os eventos de tasks fossem emitidos para outra. Na prática, os broadcasts `task:created`, `task:updated`, `task:moved` e `task:deleted` podiam não chegar ao frontend.

Solução aplicada:

```ts
function buildRoomName(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}
```

Resultado:

- O formato da room ficou alinhado com o contrato WebSocket do SDLC: `workspace:{id}`.

### 3. Proteção da resposta REST contra dados internos

Como `updateTask` e `moveTask` agora podem devolver `workspace_id` para uso interno dos sockets, o `task.controller.ts` foi ajustado para remover esse campo antes de responder às rotas REST.

Solução aplicada:

```ts
const { workspace_id: _workspaceId, ...taskResponse } = task;
```

Resultado:

- O WebSocket recebe o contexto necessário.
- A API REST mantém uma resposta mais limpa e sem campos auxiliares usados apenas para broadcast.

## Erros e Riscos Encontrados

### 1. `task:create` via WebSocket ainda precisa validar membership

Risco:

O evento `task:create` recebe `workspaceId` do cliente e chama `createTask`. O service verifica se a coluna pertence ao workspace, mas ainda deve confirmar também se o `user.id` é membro desse workspace.

Impacto:

Um utilizador autenticado que conheça um `workspaceId` e um `columnId` válidos poderia tentar criar tasks num workspace onde não pertence.

Solução recomendada:

- Fazer a validação de membership dentro de `createTask`, para proteger REST e WebSocket ao mesmo tempo.
- Alternativamente, criar um helper reutilizável no service de tasks para validar `workspace_members`.

### 2. Bug provável no cálculo da posição inicial da task

Risco:

A query usa:

```ts
.max('position as maxPo')
```

mas o código lê:

```ts
maxPositionResult?.maxPos
```

Impacto:

Se o alias devolvido for `maxPo`, o código nunca encontra `maxPos` e pode criar todas as novas tasks com `position = 0`. Isto quebra a ordenação persistida dentro da coluna.

Solução recomendada:

- Alinhar o alias e o acesso ao campo.
- Exemplo: usar `.max('position as maxPos')` ou ler `maxPositionResult?.maxPo`.

### 3. Validação Zod pode estar a cair como erro 500

Risco:

Os controllers usam `schema.parse(req.body)`, que lança `ZodError` quando o body é inválido. O `errorHandler` global atualmente trata `AppError`, mas não parece tratar `ZodError` explicitamente.

Impacto:

Payloads inválidos podem devolver `500 Internal Server Error` em vez de `400 Bad Request`.

Solução recomendada:

- Atualizar o `errorHandler` para reconhecer `ZodError` e responder com `400`.

### 4. `assigneeId` deve ser membro do workspace

Risco:

O schema valida se `assigneeId` é UUID, e a FK garante que o user existe, mas isso não garante que o utilizador atribuído pertence ao workspace da task.

Impacto:

Uma task pode ser atribuída a um utilizador de outro workspace.

Solução recomendada:

- Ao criar/atualizar uma task com `assigneeId`, validar se esse user existe em `workspace_members` para o workspace da task.

### 5. `moveTask` aceita posições demasiado altas

Risco:

O `newPosition` valida apenas inteiro e `>= 0`, mas não limita ao tamanho real da coluna destino.

Impacto:

Um cliente pode enviar `newPosition = 999` e criar buracos na ordenação, contrariando a ideia de posições contíguas.

Solução recomendada:

- Calcular o número de tasks na coluna destino.
- Fazer clamp da posição para o intervalo válido ou devolver erro `400`.

### 6. Sprint 3 menciona columns REST endpoints, mas ainda não há módulo de columns

Risco:

A documentação do Sprint 3 diz "Columns and tasks REST endpoints". O projeto tem migration para `columns`, mas não foi encontrado um módulo REST dedicado para criar, editar, apagar ou reordenar colunas.

Impacto:

O Sprint 3 pode não estar completo relativamente ao objetivo documentado.

Solução recomendada:

- Confirmar se columns REST endpoints ficam mesmo no Sprint 3.
- Se sim, criar módulo `columns` ou expandir o módulo `tasks` com endpoints para columns.

## Verificações Realizadas

Comandos executados:

```bash
npx tsc --project tsconfig.json --noEmit
npm run lint
```

Resultado:

- TypeScript passou sem erros.
- ESLint passou sem erros.

Também foi tentado executar:

```bash
npm run test:ci
```

Resultado:

- Falhou no ambiente sandbox com `spawn EPERM` ao criar workers do Jest.
- A execução fora do sandbox não foi autorizada naquele momento.

## Testes em Falta

A Definition of Done da documentação pede pelo menos um teste unitário e um teste de integração por feature. Também define testes WebSocket com `socket.io-client`.

Atualmente, as pastas `backend/tests/unit` e `backend/tests/integration` existem, mas não foram encontrados testes próprios do projeto nelas.

### Testes Unitários Recomendados

Criar testes para `task.service.ts` cobrindo:

- `createTask` cria task na coluna correta e calcula `position` corretamente.
- `createTask` rejeita criação se o user não for membro do workspace.
- `updateTask` atualiza apenas os campos enviados.
- `updateTask` valida/remova `description`, `dueDate` e `assigneeId` com `null`.
- `moveTask` move dentro da mesma coluna e reordena posições.
- `moveTask` move para outra coluna, fecha o gap na origem e abre espaço no destino.
- `moveTask` rejeita/clampa posições fora do intervalo válido.
- `deleteTask` remove a task e reordena as restantes.
- Validação de `assigneeId` como membro do workspace.

### Testes de Integração REST Recomendados

Criar testes com Supertest para:

- `GET /api/workspaces/:id/tasks` devolve colunas com tasks ordenadas por `position`.
- `POST /api/workspaces/:id/tasks` cria task quando o utilizador é membro.
- `POST /api/workspaces/:id/tasks` rejeita quando o utilizador não é membro.
- `PATCH /api/tasks/:taskId` atualiza campos válidos.
- `PATCH /api/tasks/:taskId` devolve `400` para payload inválido.
- `PATCH /api/tasks/:taskId/move` persiste coluna e posição.
- `DELETE /api/tasks/:taskId` remove a task e devolve `204`.
- Rotas protegidas devolvem erro quando não há token JWT.

### Testes WebSocket Recomendados

Criar testes com `socket.io-client` para:

- Conexão WebSocket com JWT inválido é rejeitada.
- `workspace:join` coloca o socket na room `workspace:{id}`.
- `task:create` cria task na BD e emite `task:created` para membros da room.
- `task:create` não permite criar task se o utilizador não for membro do workspace.
- `task:update` persiste alterações e emite `task:updated`.
- `task:move` persiste nova coluna/posição e emite `task:moved`.
- `task:delete` remove a task e emite `task:deleted`.
- Dois sockets no mesmo workspace recebem o mesmo broadcast.
- Um socket de outro workspace não recebe broadcasts indevidos.

### Testes de Concorrência Recomendados

O SDLC menciona risco de race conditions e optimistic locking via `updated_at`. Para Sprint 3, recomenda-se adicionar pelo menos um teste para:

- Duas movimentações simultâneas da mesma task.
- Duas criações simultâneas na mesma coluna.
- Atualização concorrente de task usando `updated_at`, caso o optimistic locking seja implementado.

## Estado Geral

O Sprint 3 está bem encaminhado na estrutura base: há separação por controller/service/routes, migrations para tasks e columns, eventos WebSocket registados e broadcast para rooms. Ainda assim, antes de considerar o sprint fechado, é importante corrigir os riscos de autorização, ordenação e validação, além de adicionar a suíte mínima de testes unitários, integração REST e WebSocket.
