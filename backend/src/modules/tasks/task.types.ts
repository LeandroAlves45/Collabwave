// Tipos de tasks. Registos da BD usam snake_case; payloads usam camelCase.

export interface Column {
  id: string; // UUID
  workspace_id: string; // UUID do workspace
  title: string;
  position: number;
}

export interface Task {
  id: string; // UUID
  column_id: string; // UUID da coluna
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  position: number;
  updated_at: string;
}

export interface TaskWithWorkspace extends Task {
  workspace_id: string;
}

export interface DeletedTaskContext {
  taskId: string;
  workspaceId: string;
}

export interface ColumnWithTasks extends Column {
  tasks: Task[];
}

export interface CreateTaskPayload {
  columnId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // default: 'medium'
  dueDate?: string;
  assigneeId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface MoveTaskPayload {
  targetColumnId: string;
  newPosition: number;
}
