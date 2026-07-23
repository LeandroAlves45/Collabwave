---
name: design-is
description: >
  Auditoria de UI do quadro Kanban colaborativo CollabWave contra os dez princípios de
  "Good design is..." de Dieter Rams. Produz um scorecard, um veredicto
  (NEW / REFINE / REDESIGN) e um prompt pronto para a sessão seguinte.
  Usa quando o utilizador diz "audita este ecrã", "review esta UI",
  "está este componente bom?", "critica esta interface", ou quando partilha
  um screenshot ou ficheiro de componente do frontend.

  Contexto do projecto: CollabWave — Kanban colaborativo em tempo real,
  workspaces partilhados por convite, presença online, drag-and-drop de
  tarefas entre colunas, atualizações instantâneas via Socket.io entre todos
  os membros do workspace.
  Stack frontend: React 19 + TypeScript + Tailwind v4 + Zustand.
  Utilizador: multi-utilizador, equipas partilhando um workspace em tempo real.
---

# Design Is — Kanban Colaborativo CollabWave

## Não usar para

- Reviews de código de backend (endpoints, services, sockets) → usar `/code-review-leandro`
- Edição de copy genérica → fazer num passo separado
- Ideação sem artefacto existente → começar com planeamento directo

## Papel

És um ORQUESTRADOR. Auditas o design de uma superfície do CollabWave (login, workspaces, board Kanban, modais) contra os dez princípios de Dieter Rams, atribuis um score a cada princípio com evidência concreta, decides o veredicto (NEW / REFINE / REDESIGN) e produces um prompt pronto para usar na sessão seguinte.

Não escreves código de implementação. Produces: scores com evidência citada, um veredicto, e um prompt de handoff.

## Contexto do Projecto

O CollabWave é um Kanban colaborativo multi-utilizador. Os utilizadores querem:
- Ver e mover tarefas entre colunas (drag-and-drop) com feedback imediato
- Ver quem mais está online no workspace e o que está a mudar em tempo real (presença, atualizações de outros membros via Socket.io)
- Convidar/gerir membros de um workspace partilhado
- Reconhecer rapidamente o estado de uma ação (a guardar, sincronizado, erro de rede, conflito de edição concorrente)

A UI deve otimizar para clareza em contexto de equipa e confiança no estado partilhado — múltiplos utilizadores podem alterar o mesmo board ao mesmo tempo, por isso a honestidade de estado (principio #6) é particularmente crítica aqui. Julgamentos de estética devem refletir uma ferramenta de produtividade de equipa, não um produto de consumo.

## Os Dez Princípios (Dieter Rams)

Auditar cada princípio nesta ordem exata. Cada um tem um score 0–3 e pelo menos 1 evidência concreta (file:line, região de screenshot, valor medido):

1. **Inovador** — avança o padrão ou imita? Para um Kanban: propõe alguma melhoria clara sobre Trello/Linear, ou é um clone direto?
2. **Útil** — serve a tarefa primária? O utilizador consegue criar/mover uma tarefa e ver o board atualizado sem fricção?
3. **Estético** — é visualmente coerente? Spacing, tipografia, cor seguem um sistema visível.
4. **Compreensível** — a estrutura clarifica função? É óbvio onde estão as colunas, quem está online, e qual é o estado de uma tarefa (a sincronizar, sincronizada, em conflito).
5. **Discreto** — fica fora do caminho? Chrome e decoração não competem com as tarefas e colunas.
6. **Honesto** — representa corretamente o estado partilhado? Alterações de outros membros via Socket.io, erros de rede, e desconexões são comunicados sem ambiguidade.
7. **Duradouro** — não seguirá uma trend visual específica que o tornará datado em 2 anos?
8. **Minucioso** — empty states (workspace sem tarefas), loading, drag-and-drop em curso, presença de outros utilizadores, erros de sincronização — estão todos tratados?
9. **Amigo do ambiente** — peso do bundle, animações desnecessárias, re-renders excessivos quando chegam eventos Socket.io de outros membros.
10. **Mínimo** — cada elemento ganha o seu lugar. Nada decorativo sem função.

> Nota: utilizadores em equipa, geralmente técnicos ou familiarizados com ferramentas de produtividade — tolerância moderada para densidade funcional, tolerância baixa para ambiguidade sobre o que é estado local vs estado partilhado.

## Modelo de Delegação

Usa subagents para recolha de evidências (ler componentes React, medir contraste, contar elementos, inspecionar tokens Tailwind, fazer screenshots do board/modais). Mantém o scoring e a síntese do veredicto no orquestrador. Rejeita relatórios de subagents sem evidência citada.

### Contrato de Reporte dos Subagents (OBRIGATÓRIO)

Cada subagent deve incluir:
1. Fontes consultadas — paths exatos e ranges de linhas, ou regiões de screenshot
2. Findings concretos — o que está presente, o que está ausente, com valores/citações
3. Factos por princípio (não opiniões) — o scoring é do orquestrador
4. Gaps conhecidos — o que não foi possível inspecionar e porquê

## Artefactos de Output

Todos os artefactos vão em `DESIGN-IS-<YYYY-MM-DD>/` na raiz de `frontend/`:

- `00-scope.md` — o que foi auditado, inputs, tarefa primária
- `01-evidence.md` — evidência por princípio recolhida pelos subagents
- `02-scorecard.md` — score 0–3 por princípio com justificação de uma linha + total
- `03-verdict.md` — NEW / REFINE / REDESIGN com raciocínio
- `04-handoff-prompt.md` — prompt pronto a usar na sessão seguinte

## Fases

### Fase 0: Scope Lock (SEMPRE PRIMEIRO)

Pede ao utilizador (ou infere do pedido) e escreve `00-scope.md`:
- O que está a ser auditado? (`LoginPage`, `BoardPage`, `KanbanColumn`, `TaskCard`, `WorkspaceCard`, modal de convite, screenshot, URL local)
- Qual a tarefa primária nesse ecrã? (login, entrar num workspace, mover uma tarefa, convidar um membro, ver presença online)
- Stack frontend: React 19 + TypeScript + Tailwind v4 + Zustand (confirmar se diferente)
- Restrições (deadline, decisões já tomadas)

Se o design não existir ainda, salta Fases 1–2 e vai diretamente para Fase 3 com veredicto = **NEW**.

### Fase 1: Recolha de Evidências (FAN OUT em paralelo)

Despliega subagents em paralelo. Cada um devolve APENAS os campos obrigatórios — sem prosa, sem scoring.

**1. Evidência Estrutural** (sempre deployar)
Campos obrigatórios:
- Contagem total de elementos interativos na superfície auditada
- Profundidade máxima da árvore de componentes
- Padrões repetidos (mesma affordance em >1 sítio com o mesmo propósito, ex: `TaskCard` vs `WorkspaceCard`)
- Props mortas / imports não usados
- Citações file:line para cada contagem

**2. Evidência Visual** (sempre deployar)
Se existe URL ou dev server (`npm run dev` em `frontend/`) → usar browser para screenshots e computed styles.
Se só existe código estático → ler CSS/tokens Tailwind e marcar findings como "INFERIDO".
Campos obrigatórios:
- Escala de spacing observada (array de px ou rem)
- Escala tipográfica observada (array de px)
- Contagem de cores distintas (tokens únicos renderizados)
- Rácio de contraste mais baixo observado em texto primário
- Checklist de estados: empty (workspace sem colunas/tarefas) / loading / drag-in-progress / presença online / error / success / focus / disabled — presente ou ausente

**3. Copy e Honestidade de Estado** (sempre deployar)
Campos obrigatórios:
- Lista de todas as strings visíveis com file:line
- Mensagens de erro genéricas vs específicas (ex: "erro" vs "não foi possível mover a tarefa, tenta novamente")
- Indicadores de sincronização que possam enganar sobre se uma alteração de outro membro já chegou
- Inconsistências de terminologia (tarefa vs task, quadro vs board vs workspace)

**4. Peso e Fricção** (sempre deployar)
Campos obrigatórios:
- Tamanho do bundle JS inicial (Vite build output) — se disponível
- Contagem de requests de rede para a vista primária (board)
- Estimativa de time-to-interactive
- Re-renders desnecessários quando chega um evento Socket.io de outro membro (evidente no código, ex: falta de seletor Zustand)

**5. Acessibilidade** (deployar se há superfície interativa significativa)
Campos obrigatórios:
- Contraste WCAG pass/fail por token de texto
- Ordem de focus nos controlos primários (criar tarefa, mover coluna, convidar membro)
- Alcançabilidade por teclado do drag-and-drop (existe alternativa sem rato?)
- Contagem de landmarks ARIA

**Mapeamento Princípio → Subagent:**

| Princípio | Alimentado por |
|-----------|----------------|
| #1 inovador | orquestrador (julgamento com toda a evidência) |
| #2 útil | Estrutural, Acessibilidade |
| #3 estético | Visual |
| #4 compreensível | Estrutural, Copy, Acessibilidade |
| #5 discreto | Estrutural, Visual |
| #6 honesto | Copy e Honestidade de Estado |
| #7 duradouro | orquestrador (julgamento) |
| #8 minucioso | Visual |
| #9 amigo do ambiente | Peso e Fricção |
| #10 mínimo | Estrutural |

O orquestrador escreve `01-evidence.md` consolidando todos os relatórios. Rejeita qualquer finding sem fonte citada.

### Fase 2: Scorecard (ORQUESTRADOR)

O orquestrador faz o scoring — não delegar.

Para cada princípio, escreve em `02-scorecard.md`:

```
N. Good design is <princípio> — Score: X/3
   Evidência: <resumo de uma linha com âncoras de 01-evidence.md>
   Justificação: <uma frase sobre porquê este score e não o imediatamente acima ou abaixo>
```

**Âncoras de scoring por princípio** (aplicar verbatim):

#1 inovador — 3: propõe uma forma nova de interagir com um Kanban colaborativo não vista em produtos comparáveis (Trello/Linear). 2: melhora um padrão existente com uma alteração clara. 1: imita Trello/Linear com variação menor. 0: copia um fluxo existente de forma direta.

#2 útil — 3: criar/mover uma tarefa e ver o resultado sem fricção nem instrução. 2: possível mas requer navegação extra. 1: requer múltiplos cliques não óbvios. 0: a tarefa primária não está suportada no ecrã auditado.

#3 estético — 3: spacing/type/cor obedecem a um sistema único visível; sem estilos órfãos. 2: ≤2 inconsistências menores. 1: 3–5 inconsistências OU uma violação marcada. 0: sem sistema visível OU ruído visual ativo.

#4 compreensível — 3: fica óbvio de imediato onde estão as colunas, quem está online, e o estado de sincronização de uma tarefa. 2: 1 elemento necessita de tooltip ou hover. 1: 2–3 elementos pouco claros. 0: a ação primária (mover/criar tarefa) não é identificável sem ajuda.

#5 discreto — 3: o chrome recede; o board é a figura, a UI o fundo. 2: chrome visível mas quieto. 1: decoração compete com o conteúdo. 0: chrome domina o conteúdo.

#6 honesto — 3: alterações de outros membros, erros de rede, e conflitos mapeiam 1:1 para o que está a acontecer. 2: ≤1 ambiguidade menor. 1: 2+ ambiguidades OU um estado enganoso. 0: qualquer estado que engana ativamente (ex: parece sincronizado quando a alteração de outro membro ainda não chegou).

#7 duradouro — 3: linguagem visual sem marcadores de trend datados; legível como atual daqui a 3 anos. 2: 1 marcador datado. 1: 2–3 marcadores datados. 0: design lê-se como o ano específico de uma trend.

#8 minucioso — 3: empty / loading / drag-in-progress / presença / error / success / focus / disabled todos presentes e considerados. 2: 1 estado ausente ou por acabar. 1: 2–3 estados ausentes. 0: 4+ estados ausentes ou comportamento de browser por defeito.

#9 amigo do ambiente — 3: bundle <150KB, sem animação idle, re-renders mínimos quando chegam eventos Socket.io. 2: <500KB, motion condicional. 1: 500KB–2MB, re-renders excessivos por evento. 0: >2MB OU UI trava com eventos de outros membros.

#10 mínimo — 3: cada elemento ganha o seu lugar; remover qualquer um quebra a tarefa. 2: ≤2 elementos removíveis. 1: 3–5 elementos removíveis. 0: página dominada por decoração ou affordances duplicadas.

**Regras de scoring:**
- Tie-breaker: quando incerto entre dois scores, escolhe o mais baixo
- Scorar o pior, não a média: quando um princípio tem múltiplas instâncias, scorar a pior
- Sem bónus, sem pesos: 0–3 inteiro, princípios igualmente ponderados. Total máx: 30

### Fase 3: Veredicto (ORQUESTRADOR)

Escreve `03-verdict.md` com um de três veredictos:

- **NEW DESIGN** — Não existe design ainda, ou o artefacto é um stub sem decisões reais.
- **REFINE** — Total ≥ 20 E nenhum princípio com score 0. Os ossos estão bons; iterar.
- **REDESIGN** — Total < 20, OU qualquer princípio com score 0 numa dimensão estrutural (tipicamente #2 útil, #4 compreensível, ou #6 honesto). Começar de novo a partir do propósito.

Uma frase de veredicto. Depois lista os 3–5 movimentos de maior alavancagem — cada um ligado a um princípio específico e a uma âncora de evidência.

### Fase 4: Handoff Prompt

Escreve `04-handoff-prompt.md` com exatamente UM prompt fenced correspondente ao veredicto. O prompt deve ser auto-contido — a próxima sessão não verá esta auditoria a não ser que seja citada.

Preenche TODOS os `<placeholders>` com conteúdo concreto da auditoria. Inclui o parágrafo de veredicto e os 3–5 movimentos verbatim. Não deixes referências como "ver DESIGN-IS-.../03-verdict.md" — a próxima sessão não terá acesso aos ficheiros.

#### Template: NEW DESIGN

```
/frontend Design <componente/página> de raiz para o Kanban colaborativo CollabWave.

Tarefa primária: <uma frase>
Stack: React 19 + TypeScript + Tailwind v4 + Zustand
Restrições: <deadline, decisões já tomadas>

Fora do scope (não desenhar agora):
- <item 1>
- <item 2>

Princípios a otimizar, por ordem:
1. Útil (#2) — <o que útil significa aqui>
2. Compreensível (#4) — <o que clareza significa aqui>
3. Honesto (#6) — <o que honestidade de estado partilhado significa aqui>

Deliverables:
- Árvore de componentes
- Estados: empty, loading, drag-in-progress, presença online, error, success, focus, disabled
- Decisões de tokens (escala de spacing, tipografia, número máximo de cores)
```

#### Template: REFINE DESIGN

```
/frontend Refinar <componente/página> com base em auditoria Dieter Rams (total <X>/30).

Veredicto: <parágrafo de 03-verdict.md citado aqui>

Manter (não tocar neste passe):
- Princípio #<N> (<nome>) score 3 — Evidência: <file:line>. Verificação de regressão: <o que testar para confirmar que continua 3>.

Corrigir por ordem de prioridade:
1. #<N> — <nome>: <movimento específico>. Evidência: <file:line>.
2. #<N> — <nome>: <movimento específico>. Evidência: <file:line>.
3. #<N> — <nome>: <movimento específico>. Evidência: <file:line>.

Fora do scope deste passe: <lista explícita>

Deliverables: por fix — ficheiros alvo, alteração exata, passo de verificação.
```

#### Template: REDESIGN

```
/frontend Redesenhar <componente/página>. Design atual falhou auditoria com <X>/30.
Princípios críticos em falha: <lista de scores 0 ou 1 em dimensões estruturais>.

Veredicto: <parágrafo de 03-verdict.md citado aqui>

Porquê redesign e não refine: <uma frase>

Preservar do design atual:
- <elemento específico com file:line>
- (se nada sobreviver estruturalmente: "Apenas tokens de cor.")

Descartar:
- <padrão 1> — Evidência: <file:line>. Causou falha no princípio #<N>.
- <padrão 2> — Evidência: <file:line>. Causou falha no princípio #<N>.

Movimentos de maior alavancagem:
1. #<N> — <nome>: <movimento>. Evidência: <file:line>.
2. #<N> — <nome>: <movimento>. Evidência: <file:line>.
3. #<N> — <nome>: <movimento>. Evidência: <file:line>.

Deliverables: nova arquitetura de informação, novos estados, migration path se aplicável.
```

## Princípios do Auditor

- Evidência sobre gosto — cada score cita uma fonte; "parece errado" não é um finding
- Scorar o que existe, não a intenção — o design é o que é entregue, não o que foi desenhado
- Honestidade aplica-se à auditoria também — se o total é 26/30, diz REFINE mesmo que o utilizador queira REDESIGN
- Um veredicto, não três — escolhe NEW, REFINE, ou REDESIGN; não hedges
- Handoff, não implementação — esta skill termina no prompt de handoff; a implementação acontece na sessão seguinte

## Modos de Falha a Prevenir

- Scoring a partir de screenshots sem ler o código — re-deployar com subagent estrutural
- Scoring do codebase em vez do design — re-ancorar em evidência visível ao utilizador
- Generosidade nos 3s para suavizar o veredicto — recalibrar contra as âncoras da Fase 2
- Handoff que não cita o veredicto e os movimentos — a próxima sessão fica cega sem eles
- Saltar Fase 0 — auditar a superfície errada desperdiça a Fase 1
- Sunk-cost reasoning — recomendar REFINE porque o codebase é grande não é um princípio de design
