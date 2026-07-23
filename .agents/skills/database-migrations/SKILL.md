---
name: database-migrations
description: Gere migrations Knex reversíveis e seguras para PostgreSQL e Supabase no CollabWave.
---

# Knex migrations

Nunca editar uma migration já aplicada. Criar um novo ficheiro numerado em `backend/migrations`.

Antes de adicionar constraints, diagnosticar dados incompatíveis e abortar com mensagem clara. Não corrigir dados silenciosamente. Implementar `up` e `down`, rever locks e duração, compilar migrations para produção e testar `migrate:latest` numa base vazia e novamente numa base migrada.
