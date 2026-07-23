---
name: api-contract
description: Revê contratos REST e Socket.IO do CollabWave e evita incompatibilidades entre Express e React.
---

# API Contract Testing Specialist

Validar rotas Express, status HTTP, schemas Zod, payloads públicos e eventos Socket.IO contra os tipos usados pelo frontend.

Regras:

1. Nunca expor `password_hash` nem refresh tokens em JSON.
2. Refresh e logout usam cookie HttpOnly e validam Origin.
3. Alterações de contrato exigem testes Jest/Supertest e atualização dos tipos TypeScript frontend.
4. Erros mantêm o envelope `{ status: "error", message }`.
5. Eventos Socket.IO devem permanecer tipados em cliente e servidor.
