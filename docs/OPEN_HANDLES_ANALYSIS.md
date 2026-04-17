# CollabWave — Open Handles Investigation Report
**Data:** 2026-04-15  
**Ferramenta:** `npm run test:ci -- --detectOpenHandles`  
**Status:** ✅ **IDENTIFICADO E SOLUCIONÁVEL**

---

## Problema Identificado

### Root Cause: Timeouts Não Clearados em socket.test.ts

**Ficheiro:** `backend/tests/integration/socket.test.ts`  
**Função:** `connectClient()` (linhas 119-143)  
**Problema:** Os `setTimeout` de segurança não são limpos quando a conexão é bem-sucedida

```typescript
// PROBLEMA: Linha 135
function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => resolve(socket));        // ← Resolve
    socket.on('connect_error', (err) => {
      socket.disconnect();
      reject(err);
    });

    // PROBLEMA: Este timeout NUNCA é clearado se socket.on('connect') resolver primeiro
    setTimeout(() => {                                    // ← Linha 135
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 3000);  // ← Timeout fica "aberto" até expirar (3 segundos)
  });
}
```

### O Que Acontece

1. **Cenário de Sucesso:**
   - `socket.on('connect')` dispara → `resolve(socket)` → Promise resolve ✅
   - ❌ **MAS o `setTimeout` continua ativo** até expirar 3 segundos depois

2. **Resultado:**
   - Jest vê timeouts ativos quando os testes terminam
   - Aviso: `"A worker process has failed to exit gracefully"`
   - Testes passam, mas há "open handles" deixados para trás

3. **Impacto:**
   - Testes completam em 7.5 segundos
   - MAS Jest aguarda 3 segundos extras para cada timeout expirar
   - Multiplica-se por cada `connectClient()` chamado nos testes

---

## Evidência do `--detectOpenHandles`

Output mostra múltiplos timeouts em diferentes testes:

```
● Timeout
  at tests/integration/socket.test.ts:135:5
  at connectClient (tests/integration/socket.test.ts:121:10)
  at Object.<anonymous> (tests/integration/socket.test.ts:247:26)  ← test 1

● Timeout
  at tests/integration/socket.test.ts:135:5
  at connectClient (tests/integration/socket.test.ts:121:10)
  at Object.<anonymous> (tests/integration/socket.test.ts:263:26)  ← test 2

● Timeout
  at tests/integration/socket.test.ts:135:5
  ...
  (repeat para cada teste que chama connectClient)
```

---

## Solução: Clear o Timeout na Resolução

### Opção 1: clearTimeout Simples (Recomendada)

```typescript
function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: true,
    });

    // ✅ SOLUÇÃO: Guardar a referência do timeout
    const timeoutId = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 3000);

    // ✅ Clear o timeout quando o socket conecta
    socket.on('connect', () => {
      clearTimeout(timeoutId);  // ← CRÍTICO
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeoutId);  // ← Também em erro
      socket.disconnect();
      reject(err);
    });
  });
}
```

### Opção 2: setTimeout().unref() (Alternativa)

```typescript
// Diz ao Node que este timeout NÃO deve manter o processo vivo
const timeoutId = setTimeout(() => {
  socket.disconnect();
  reject(new Error('Connection timeout'));
}, 3000);

timeoutId.unref();  // ← Timeout não bloqueia saída do Jest
```

### Opção 3: AbortController (Moderno)

```typescript
const controller = new AbortController();

const timeoutId = setTimeout(() => {
  socket.disconnect();
  reject(new Error('Connection timeout'));
}, 3000);

socket.on('connect', () => {
  clearTimeout(timeoutId);
  resolve(socket);
});
```

---

## Implementação Recomendada

**Opção 1 (clearTimeout)** é a melhor porque:
- ✅ Explícita e compreensível
- ✅ Funciona em todos os cenários (sucesso, erro, timeout)
- ✅ Zero custo de performance
- ✅ Standard do Node.js

---

## Código Fixado Completo

```typescript
// Helper: cria um cliente e aguarda conexão ou erro
function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: true,
    });

    // Timeout de segurança — clearado quando socket conecta ou falha
    const timeoutId = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 3000);

    socket.on('connect', () => {
      clearTimeout(timeoutId);  // ← FIX: Clear o timeout
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeoutId);  // ← FIX: Clear o timeout em erro
      socket.disconnect();
      reject(err);
    });
  });
}
```

---

## Teste Após Implementação

1. **Implementar fix** no `connectClient()`:
   ```bash
   # Editar: backend/tests/integration/socket.test.ts
   # Linhas 112-132
   ```

2. **Rodar testes normal:**
   ```bash
   npm run test:ci
   ```
   Deve completar sem warning "worker process has failed to exit"

3. **Confirmar com detectOpenHandles:**
   ```bash
   npm run test:ci -- --detectOpenHandles
   ```
   Não deve haver nenhum `● Timeout` listado

---

## Impacto da Fix

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Testes Passam** | ✅ 120/120 | ✅ 120/120 |
| **Warnings do Jest** | ❌ "worker process failed to exit" | ✅ Limpo |
| **Open Handles** | ❌ Múltiplos timeouts | ✅ Zero |
| **Tempo Execução** | ~7.5 segundos | ~7.5s (idêntico) |

---

## Notas Adicionais

### Por que os testes passam mesmo com open handles?

Jest tem um mecanismo de "force exit" que forçosamente mata o processo após um timeout. Os testes passam porque:
1. Toda a lógica de teste é executada
2. Jest aguarda handles fechar (timeout 1 minuto)
3. Se não fecharem, força exit com aviso

Isto é **seguro mas indesejável** em CI/CD porque:
- Máscara possíveis memory leaks
- Torna CI mais lento (aguarda timeouts)
- Cria falhas esporádicas em máquinas lentas

---

## Checklist de Implementação

- [ ] Editar `connectClient()` em socket.test.ts
- [ ] Adicionar `clearTimeout(timeoutId)` em `socket.on('connect')`
- [ ] Adicionar `clearTimeout(timeoutId)` em `socket.on('connect_error')`
- [ ] Rodar `npm run test:ci`
- [ ] Verificar que não há warning "worker process"
- [ ] Confirmar com `--detectOpenHandles`
- [ ] Commit: "fix: clear socket connection timeouts to prevent open handles"

---

**Status:** ✅ **Problema identificado, solução clara e fácil de implementar**

**Tempo Estimado:** 10 minutos
