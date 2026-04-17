// Type responsável por representar um workspace

// Os 3 roles possíveis, espelhando o schema do backend
export type WorkspaceRole = 'owner' | 'admin' | 'member'

// Workspace completo conforme o retornado pelo backend
export interface Workspace {
  id: string // ID do workspace
  name: string // Nome do workspace
  description?: string // Descrição do workspace
  ownerId: string // ID do usuário proprietário do workspace
  inviteCode: string // Código de convite para o workspace
  createdAt: string // Timestamp de criação do workspace
}

// Entrada de membro com os dados do utilizador já incluídos
export interface WorkspaceMember {
  workspaceId: string // ID do workspace
  userId: string // ID do usuário
  role: WorkspaceRole // Role do usuário no workspace
  joinedAt: string // Timestamp de quando o usuário entrou no workspace
  user: {
    id: string // ID do usuário
    name: string // Nome do usuário
    email: string // Email do usuário
    avatarUrl?: string // URL do avatar do usuário
  }
}

// Payload para POST /api/workspaces para criar um novo workspace
export interface CreateWorkspacePayload {
  name: string // Nome do workspace
  description?: string // Descrição do workspace (opcional)
}

// Payload para POST /api/workspaces/join
export interface JoinWorkspacePayload {
  inviteCode: string // Código de convite para entrar no workspace
}
