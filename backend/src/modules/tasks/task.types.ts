// ============================================================
// CollabWave — Task Module Types
// ============================================================
// Interfaces TypeScript para o domínio de tarefas.
//
// CONVENÇÃO (igual a workspace.types.ts):
//   - Interfaces que mapeiam registos da BD → snake_case
//     (ex: Task.column_id, Task.due_date)
//   - Interfaces de payload HTTP → camelCase
//     (ex: CreateTaskPayload.columnId, MoveTaskPayload.newPosition)
//
// Esta convenção está alinhada com:
//   - workspace.types.ts (JoinWorkspacePayload.inviteCode)
//   - SDD secção 3.4.2 (task:create usa columnId, dueDate)
// ============================================================

// --------------------------------------------------------------
// Column
// --------------------------------------------------------------
// Mapeia a tabela "columns" da BD. Campos em snake_case.
export interface Column {
  id: string; // UUID
  workspace_id: string; // UUID do workspace
  title: string;
  position: number; // Usado para ordenação dentro da coluna
}

// --------------------------------------------------------------
// Task
// ---------------------------------------------------------------
// Mapeia a tabela "tasks" da BD. Campos em snake_case.
//
// updated_at é usado para optimistic locking:
// ao atualizar , comparamos o updated_at do cliente com o da BD
// para detectar conflitos de edição simultânea.
export interface Task {
  id: string; // UUID
  column_id: string; // UUID da coluna onde a tarefa está
  title: string;
  description: string | null;
  assignee_id: string | null; // UUID do utilizador atribuído, pode ser null
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null; // ISO string, pode ser null
  position: number; // Usado para ordenação dentro da coluna
  updated_at: string; // ISO string, usado para optimistic locking
}

// --------------------------------------------------------------
// ColumnWithTasks
// --------------------------------------------------------------
// Tipo de resposta enriquecido para GET /api/workspaces/:id/tasks.
// Combina os dados da coluna com as tarefas associadas, ordenadas por posição.
export interface ColumnWithTasks extends Column {
  tasks: Task[]; // Lista de tarefas nesta coluna, ordenada por position
}

// --------------------------------------------------------------
// CreateTaskPayload
// --------------------------------------------------------------
// Body de POST /api/workspaces/:id/tasks.
// Campos em camelCase, alinhados com a convenção de payloads HTTP.
export interface CreateTaskPayload {
  columnId: string; // UUID da coluna onde criar a tarefa
  title: string; // Título da tarefa (obrigatório)
  description?: string; // Descrição da tarefa (opcional)
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // default: 'medium'
  dueDate?: string; // ISO string, data de vencimento (opcional)
  assigneeId?: string; // UUID do utilizador a atribuir (opcional)
}

// --------------------------------------------------------------
// UpdateTaskPayload
// --------------------------------------------------------------
// Body de PATCH /api/tasks/:taskId.
// Campos são opcionais, permitindo atualizações parciais.
export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assigneeId?: string | null;
}

// --------------------------------------------------------------
// MoveTaskPayload
// ---------------------------------------------------------------
// Body de PATCH /api/tasks/:taskId/move.
export interface MoveTaskPayload {
  targetColumnId: string; // UUID da coluna de destino
  newPosition: number; // Nova posição dentro da coluna de destino
}
