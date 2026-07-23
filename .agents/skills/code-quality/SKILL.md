---
name: code-quality
description: Regras de qualidade para Express, Knex, Socket.IO e React no CollabWave.
---

# Qualidade de código

Manter TypeScript strict, funções pequenas, nomes explícitos e fronteiras entre controllers, services, middleware e infraestrutura.

Evitar `any`, logs com PII, estado duplicado e queries fora de transações quando existe uma invariância concorrente. Comentários explicam decisões e riscos. Validar com lint, type-check, testes e build proporcionais à alteração.
