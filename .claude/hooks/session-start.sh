#!/bin/bash
# Prints a short project banner at the start of every Claude Code session.
# Used as a SessionStart hook (matcher: "").

find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.claude" ] || [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

ROOT=$(find_project_root)

echo "=== CollabWave ==="
echo "Stack: Node 20 / Express 5 / Socket.io / Knex / PostgreSQL / Redis + React 19 / TypeScript / Vite"

# Git commands only if in a git repository
if [ -d "$ROOT/.git" ]; then
  BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
    echo "Branch atual: $BRANCH"
  fi

  LAST_COMMIT=$(git -C "$ROOT" log --oneline -1 2>/dev/null)
  if [ -n "$LAST_COMMIT" ]; then
    echo "Ultimo commit: $LAST_COMMIT"
  fi
fi

# Memory - verifica antes de tentar ler
MEMORY_FILE="$ROOT/.claude/memory/MEMORY.md"
if [ -f "$MEMORY_FILE" ]; then
  echo ""
  echo "--- MEMORY.md ---"
  cat "$MEMORY_FILE"
fi

# Todo - verifica antes de tentar ler
TODO_FILE="$ROOT/.claude/tasks/todo.md"
if [ -f "$TODO_FILE" ]; then
  echo ""
  echo "--- tasks/todo.md ---"
  cat "$TODO_FILE"
fi

echo "========================================"
exit 0