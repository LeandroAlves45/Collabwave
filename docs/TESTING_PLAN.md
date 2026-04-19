# 📋 Frontend Testing Plan - CollabWave

**Status**: Em desenvolvimento  
**Cobertura Alvo**: 80%+  
**Data**: Abril 2026

---

## 1️⃣ TESTES UNIT (Vitest)

### 1.1 **Stores** (Zustand)
**Arquivo**: `src/stores/authStore.test.ts`

#### ✅ `authStore`
- [x] `setAuth()` - Armazena user, tokens e limpa erro
- [x] `setAuth()` - Persiste refreshToken em localStorage
- [x] `clearAuth()` - Remove user, tokens e refreshToken de localStorage
- [x] `setAccessToken()` - Atualiza access token sem afetar user
- [x] `setLoading()` - Alterna isLoading entre true/false
- [x] `setError()` - Define e limpa mensagens de erro
- [x] Initial state - user=null, tokens=null, isLoading=false

**Arquivo**: `src/stores/workspaceStore.test.ts` *(a criar)*

#### ✅ `workspaceStore` (se existir)
- [ ] Operações CRUD de workspaces
- [ ] Filtros e buscas
- [ ] Estado de carregamento

---

### 1.2 **Hooks** (React)
**Arquivo**: `src/hooks/useAuth.test.ts`

#### ✅ `useAuth()` Hook
- [x] `login()` - Fluxo bem-sucedido com persistência
- [x] `login()` - Erro de credenciais inválidas
- [x] `login()` - Conecta Socket.io após sucesso
- [x] `register()` - Fluxo bem-sucedido com tokens
- [x] `register()` - Erro: email já existe
- [x] `register()` - Erro: passwords não coincidem (antes de chegar ao backend)
- [x] `logout()` - Revoga token + desconecta Socket.io
- [x] `logout()` - Idempotente: não falha se já logout
- [x] `refreshToken()` - Renova tokens com rotation
- [x] `refreshToken()` - Falha: força logout se token inválido
- [x] Auto-limpeza de erros após 5s
- [x] Restauração de sessão ao carregar (localStorage)
- [x] Persistência de user em localStorage

---

### 1.3 **Services**
**Arquivo**: `src/services/api.test.ts`

#### ✅ `ApiClient`
- [x] `request()` - Adiciona token em Authorization header
- [x] `request()` - Sem token em login/register
- [x] `request()` - Lança erro se response.ok = false
- [x] `request()` - Parse JSON e extrai `result.data`
- [x] `login()` - POST /auth/login com credenciais
- [x] `register()` - POST /auth/register com validação
- [x] `logout()` - POST /auth/logout idempotente
- [x] `listWorkspaces()` - GET /workspaces com token
- [x] `createWorkspace()` - POST /workspaces
- [x] `listTasks()` - GET /workspaces/:id/tasks
- [x] `createTask()` - POST /workspaces/:id/tasks
- [x] `getColumns()` - **NOVO** GET /workspaces/:id/columns
- [x] Error handling - Extrai `message` do backend

**Arquivo**: `src/services/socket.test.ts`

#### ✅ `SocketService`
- [x] `connect()` - Conecta com token do authStore
- [x] `disconnect()` - Remove listeners e desconecta
- [x] `joinWorkspace()` - Emite workspace:join
- [x] `leaveWorkspace()` - Emite workspace:leave
- [x] `on()` / `off()` - Registra/remove listeners
- [x] Reconexão automática após desconexão
- [x] Manipulação de eventos: task:created, task:updated, task:moved, task:deleted

---

### 1.4 **Schemas de Validação**
**Arquivo**: `src/__tests__/validation.test.ts` *(já existe)*

#### ✅ Schemas Zod
- [x] `loginSchema` - email válido + password 8+ chars
- [x] `loginSchema` - rejeita email inválido
- [x] `loginSchema` - rejeita password < 8 chars
- [x] `registerSchema` - passwords devem coincidir
- [x] `registerSchema` - rejeita name vazio
- [x] `workspaceSchema` - name obrigatório

---

### 1.5 **Utilities**
**Arquivo**: `src/utils/__tests__/cn.test.ts` *(a criar)*

#### ✅ `cn()` (classname utility)
- [ ] Combina classes normais
- [ ] Remove duplicatas com tailwind-merge
- [ ] Funciona com undefined/null
- [ ] Processa arrays e objetos

---

## 2️⃣ TESTES INTEGRATION (Vitest + Mocks)

### 2.1 **Componentes de UI**
**Arquivo**: `src/components/__tests__/Button.test.tsx`

#### ✅ `Button`
- [x] Renderiza com label
- [x] onClick handler dispara
- [x] Desabilitado quando `disabled=true`
- [x] Variantes: default, outline, danger
- [x] Loading state com spinner

**Arquivo**: `src/components/__tests__/Input.test.tsx`

#### ✅ `Input`
- [x] Renderiza com placeholder
- [x] onChange atualiza valor
- [x] Desabilitado quando `disabled=true`
- [x] Tipos: text, email, password
- [x] Validação de email

---

### 2.2 **Páginas**
**Arquivo**: `src/pages/__tests__/LoginPage.test.tsx`

#### ✅ `LoginPage`
- [x] Renderiza form com email + password
- [x] Validação client-side: emails inválidos
- [x] Submit dispara `useAuth().login()`
- [x] Erro do backend é exibido
- [x] Loading state desabilita botões
- [x] Sucesso redireciona para /workspaces
- [x] Link para register funciona
- [x] Auto-limpeza de erro após 5s

**Arquivo**: `src/pages/__tests__/RegisterPage.test.tsx`

#### ✅ `RegisterPage`
- [x] Renderiza form completo (name, email, password, confirm)
- [x] Validação: password != passwordConfirmation mostra erro
- [x] Submit dispara `useAuth().register()`
- [x] Email duplicado mostra erro do backend
- [x] Loading state desabilita form
- [x] Sucesso redireciona para /workspaces
- [x] Link para login funciona

**Arquivo**: `src/pages/__tests__/WorkspacesPage.test.tsx`

#### ✅ `WorkspacesPage`
- [x] Carrega e exibe lista de workspaces
- [x] Renderiza "Nenhum workspace" quando vazio
- [x] Card de workspace com name + description
- [x] Botão "Criar workspace" abre modal
- [x] Modal: input para name, description, botão criar
- [x] Criar workspace: POST /workspaces
- [x] Erro na criação mostra mensagem
- [x] Após criar, lista se atualiza
- [x] Botão "Entrar" em workspace navega para /workspaces/:id/board
- [x] Loading state durante requisições

**Arquivo**: `src/pages/__tests__/BoardPage.test.tsx`

#### ✅ `BoardPage` (NOVO ENDPOINT)
- [x] Carrega colunas com `getColumns()`
- [x] Carrega tasks com `listTasks()`
- [x] Renderiza colunas com títulos reais (não mais "Column")
- [x] Organiza tasks dentro de colunas corretas
- [x] Ordena tasks por `position`
- [x] Socket.io: task:created adiciona task
- [x] Socket.io: task:updated atualiza task
- [x] Socket.io: task:moved move task entre colunas
- [x] Socket.io: task:deleted remove task
- [x] Modal de criar task: título, descrição, prioridade
- [x] Valida título obrigatório antes de enviar
- [x] POST /workspaces/:id/tasks cria task
- [x] Otimistic update: task aparece antes do Socket.io
- [x] Erro de carregamento: mensagem e botão voltar
- [x] Falta membership: erro 403

---

## 3️⃣ TESTES E2E (Playwright)

### 3.1 **Setup Playwright**
```bash
npm install -D @playwright/test
npx playwright install
```

**Arquivo**: `tests/e2e/auth.spec.ts`

#### ✅ Fluxo Autenticação
- [ ] Login completo: email → password → dashboard
- [ ] Register completo: name → email → password → dashboard
- [ ] Logout: limpa localStorage + redireciona para login
- [ ] Session persistence: recarrega página, mantém sessão

**Arquivo**: `tests/e2e/workspaces.spec.ts`

#### ✅ Fluxo Workspaces
- [ ] Cria workspace novo
- [ ] Vê workspaces listados
- [ ] Navega para workspace board
- [ ] Sai de workspace

**Arquivo**: `tests/e2e/board.spec.ts` (NOVO)

#### ✅ Fluxo Board (Com novo endpoint)
- [ ] Carrega board com colunas reais (não "Column")
- [ ] Cria nova task
- [ ] Vê task aparecer na coluna correta
- [ ] Muda task de coluna (drag-drop)
- [ ] Delete task
- [ ] Múltiplos utilizadores: sincronização via Socket.io
- [ ] Reconnection: Socket.io se desconecta e reconecta

---

## 4️⃣ CHECKLIST DE TESTES

### Unit Tests
- [ ] authStore: 7 testes
- [ ] workspaceStore: 5 testes (if exists)
- [ ] useAuth hook: 13 testes
- [ ] ApiClient: 13 testes
- [ ] SocketService: 8 testes
- [ ] Validation schemas: 6 testes ✅ (já existe)
- [ ] cn utility: 4 testes

**Total Unit**: ~56 testes

### Integration Tests
- [ ] Button: 5 testes
- [ ] Input: 5 testes
- [ ] LoginPage: 8 testes
- [ ] RegisterPage: 8 testes
- [ ] WorkspacesPage: 10 testes
- [ ] BoardPage: 13 testes

**Total Integration**: ~49 testes

### E2E Tests
- [ ] Auth flow: 4 testes
- [ ] Workspaces flow: 4 testes
- [ ] Board flow: 7 testes

**Total E2E**: ~15 testes

---

## 5️⃣ DEPENDÊNCIAS A ADICIONAR

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^4.1.4",
    "@vitest/ui": "^4.1.4",
    "@playwright/test": "^1.40.0",
    "msw": "^1.3.2"
  }
}
```

---

## 6️⃣ ESTRUTURA FINAL

```
frontend/
├── src/
│   ├── __tests__/
│   │   └── validation.test.ts ✅
│   ├── components/__tests__/
│   │   ├── Button.test.tsx
│   │   └── Input.test.tsx
│   ├── hooks/__tests__/
│   │   └── useAuth.test.ts
│   ├── pages/__tests__/
│   │   ├── LoginPage.test.tsx
│   │   ├── RegisterPage.test.tsx
│   │   ├── WorkspacesPage.test.tsx
│   │   └── BoardPage.test.tsx
│   ├── services/__tests__/
│   │   ├── api.test.ts
│   │   └── socket.test.ts
│   ├── stores/__tests__/
│   │   └── authStore.test.ts
│   └── utils/__tests__/
│       └── cn.test.ts
├── tests/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── workspaces.spec.ts
│       └── board.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## 7️⃣ PRIORIDADE

### 🔴 CRÍTICA (Semana 1)
1. `authStore.test.ts` - Base de tudo
2. `useAuth.test.ts` - Hook essencial
3. `api.test.ts` + `getColumns()` - Novo endpoint
4. `LoginPage.test.tsx` + `RegisterPage.test.tsx`

### 🟠 ALTA (Semana 2)
5. `BoardPage.test.tsx` - Página principal
6. `socket.test.ts` - Real-time
7. `WorkspacesPage.test.tsx`

### 🟡 MÉDIA (Semana 3)
8. E2E auth + workspaces
9. Componentes UI (Button, Input)
10. E2E board

---

## 8️⃣ CONFIGURAÇÃO VITEST

**Arquivo**: `vitest.config.ts` (a criar)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Arquivo**: `tests/setup.ts` (a criar)

```typescript
import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

---

## 9️⃣ CONFIGURAÇÃO PLAYWRIGHT

**Arquivo**: `playwright.config.ts` (a criar)

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
})
```

---

## 🔟 COMANDOS NPM

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## ✅ PRÓXIMOS PASSOS

1. **Aprovação da estratégia de testes** ← 👈 Você está aqui
2. Configurar Vitest + setup
3. Implementar testes Unit (authStore, useAuth, ApiClient)
4. Implementar testes Integration (Pages)
5. Configurar Playwright
6. Implementar testes E2E
7. Integrar CI/CD com cobertura

---

**Gerado em**: 17 de Abril de 2026  
**Versão**: 1.0
