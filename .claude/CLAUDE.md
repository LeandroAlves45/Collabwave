# CollabWave

Backend: Node 20, TypeScript, Express 5, Socket.io 4, Knex + PostgreSQL, ioredis + `@socket.io/redis-adapter`, JWT (access + refresh), bcryptjs, Helmet, express-rate-limit.
Frontend: React 19, TypeScript, Vite 6, Tailwind v4, Zustand, react-hook-form + zod, socket.io-client, lucide-react.
Kanban colaborativo em tempo real, multi-utilizador, com workspaces partilhados por convite.

## GOLDEN RULES

- Arquitetura: modular por feature em `backend/src/modules/{auth,workspaces,columns,tasks}` (controller → service → routes, com `.types.ts` e `.validators.ts` próprios). Ver architecture.md
- Sockets: lógica de tempo real isolada em `backend/src/sockets/` (handlers por domínio, middleware de auth do socket, `presence.service.ts`)
- Memoria: sistema de memória persistente vive em `.claude/memory/` (ficheiro índice `MEMORY.md` + notas individuais), não na raiz do repo. Ler no início da sessão para estado atual, decisões tomadas e gotchas conhecidos
- Base de dados: ver database-schema.md. Migrations via `npm run migrate:make` (Knex, em `backend/migrations/*.ts`), nunca editar uma migration já aplicada
- Segurança: ver security-conventions.md. Secrets em environment variables, nunca hardcoded. Queries via Knex query builder (parametrizadas), nunca SQL concatenado
- Testing: Jest + Supertest no backend (`npm run test:ci`), Vitest + React Testing Library + Playwright no frontend. Coverage alvo 80%+
- Git: Feature branches, conventional commits, testes a passar antes de commit
- NO edits: migrations existentes em `backend/migrations/` (criar sempre uma nova), ficheiros `.env`, valores hardcoded
- Comentários e documentação em Português de Portugal
- Falar sempre em Português
- Avaliar sempre as respostas antes de as apresentar
- Avaliar sempre como o código e o ficheiro foram implementados. Ao escrever ficheiros MD, usar comentários TSDoc/JSDoc no TypeScript (backend e frontend) para documentar o código
- Quero aprender neste projeto portanto, sempre que me pedires código de sprints/features cria um ficheiro md ou mais em docs (a direção específica é combinada previamente) com pseudocódigo alargado, indicando que tipo de JSDoc e comentários colocar, e métodos/classes em inglês
- Só editas código ou ficheiros se eu pedir especificamente
- No final de cada sessão cria um ficheiro md em `.claude/memory/Sessions/` com os pontos fundamentais da sessão
- Compacta sempre que atingir 50% da sessão
- Sugere mudar para os diferentes planos dependendo da task pedida
- Sempre que eu precisar de tomar uma decisão técnica, oferece-me a melhor sugestão tendo em conta os trade-offs baseado em critérios técnicos, de DRY e Clean Code
- Podes rodar comandos no terminal, exceto comandos destrutivos mencionados em hooks ou outro ficheiro relevante
- Sempre que finalizarmos um sprint ou pedir ficheiros md, coloca uma checklist e, ao finalizar, coloca "Finalizado"

## PROTECTED FILES — NUNCA LER OU ESCREVER

- `.env`, `.env.*`, `.env.local`, `.env.production`
- `**/*.pem`, `**/*.key`, `**/secrets/**`
- `backend/migrations/**` — nunca editar uma migration existente, criar sempre uma nova (`npm run migrate:make`)

Se uma tarefa exigir tocar nestes ficheiros, parar e pedir ao utilizador para o fazer manualmente.

## WORKFLOW ORCHESTRATION

### 1. Plan Mode Default

- Entrar em plan mode para qualquer tarefa não trivial (3+ passos ou decisões arquiteturais)
- Se algo correr mal, PARAR e replanear imediatamente - não insistir no caminho errado
- Usar plan mode também para passos de verificação, não só para construir
- Escrever specs detalhadas à partida para reduzir ambiguidade

### 2. Subagent Strategy

- Usar subagentes livremente para manter a context window principal limpa
- Delegar pesquisa, exploração e análise paralela a subagentes
- Para problemas complexos, atirar mais compute via subagentes
- Uma tarefa por subagente para execução focada

### 3. Self-improvement Loop

- Ao final de cada sessão, captura todos os erros, desafios e pontos de fricção encontrados e coloca dentro de `.claude/memory/MEMORY.md`
- Depois de QUALQUER correção do utilizador: atualizar `.claude/tasks/correction.md` com o padrão do erro
- Se o problema for da SKILL, ajusta a skill para o projeto
- Sempre usa a pasta `.claude` no começo da sessão
- Escrever regras próprias que previnam o mesmo erro
- Iterar sem piedade nas lições até a taxa de erro baixar
- Rever lessons no início da sessão para o projeto relevante

### 4. Verification Before Done

- Nunca marcar uma tarefa como concluída sem provar que funciona
- Comparar comportamento entre main e as alterações quando relevante
- Perguntar: "um staff engineer aprovaria isto?"
- Correr testes, verificar logs, demonstrar correção

### 5. Demand Elegance (Balanced)

- Para alterações não triviais: parar e perguntar "há uma forma mais elegante?"
- Se uma correção parecer um hack: "Sabendo tudo o que sei agora, implementa a solução elegante"
- Saltar isto para correções simples e óbvias, não sobre-engenheirar
- Desafiar o próprio trabalho antes de o apresentar

### 6. Autonomous Bug Fixing

- Perante um bug report: corrigir diretamente, sem pedir ajuda passo a passo
- Apontar para logs, erros, testes a falhar, depois resolver
- Zero context switching exigido ao utilizador
- Corrigir testes de CI a falhar sem instruções detalhadas

## Task Management

1. **Plan First**: Escrever o plano em `.claude/tasks/todo.md` com items marcáveis
2. **Verify Plan**: Confirmar com o utilizador antes de implementar
3. **Track Progress**: Marcar items como concluídos à medida que avança
4. **Explain Changes**: Resumo de alto nível a cada passo
5. **Document Results**: Adicionar secção de review a `.claude/tasks/todo.md`
6. **Capture Lessons**: Atualizar `.claude/tasks/lessons.md` depois de correções

## Core Principles

- **Simplicity First**: Cada alteração o mais simples possível. Impacto mínimo no código
- **No Laziness**: Encontrar causas raiz. Sem soluções temporárias. Padrão de senior developer
- **Minimal Impact**: Alterações tocam apenas no necessário. Evitar introduzir bugs
