// Type de task.ts
// Contrato com os dados de uma task conforme o backend

// Espelha o enum de prioridade da DB
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// Task completa conforme guardada no backend
export interface Task {
  id: string // ID da task
  columnId: string // ID da coluna onde a task está
  title: string // Título da task
  description?: string // Descrição da task (opcional)
  assigneeId?: string // ID do usuário a quem a task está atribuída (opcional)
  priority: TaskPriority // Prioridade da task
  dueDate?: string // Data de vencimento da task (opcional)
  position: number // Posição da task dentro da coluna para ordenação
  createdAt: string // Timestamp de criação da task
  updatedAt: string // Timestamp da última atualização da task
}

// Coluna do board sem tasks
export interface Column {
  id: string // ID da coluna
  workspaceId: string // ID do workspace a que a coluna pertence
  title: string // Título da coluna
  position: number // Posição da coluna dentro do board para ordenação
}

// Shape retornado por GET /api/workspaces/:id/tasks
export interface ColumnWithTasks extends Column {
  tasks: Task[] // Array de tasks dentro da coluna
}

// Payload para POST /api/workspaces/:id/tasks para criar uma nova task
export interface CreateTaskPayload {
  columnId: string // ID da coluna onde a task será criada
  title: string // Título da task
  description?: string // Descrição da task (opcional)
  priority: TaskPriority // Prioridade da task
  dueDate?: string // Data de vencimento da task (opcional)
}

// Payload para PATC /api/tasks/:taskId para atualizar uma task existente
export interface UpdateTaskPayload {
  title?: string // Título da task (opcional)
  description?: string // Descrição da task (opcional)
  assigneeId?: string // ID do usuário a quem a task está atribuída (opcional)
  priority?: TaskPriority // Prioridade da task (opcional)
  dueDate?: string // Data de vencimento da task (opcional)
}

// Payload para PATCH /api/tasks/:taskId/move
export interface MoveTaskPayload {
  targetColumnId: string // ID da coluna para onde a task será movida
  newPosition: number // Nova posição da task dentro da coluna para ordenação
}
