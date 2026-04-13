// ============================================================
// CollabWave — Workspace Module Types
// ============================================================
// Interfaces TypeScript para o módulo de workspaces.
//
// CONVENÇÃO:
//   - Interfaces que representam registos da BD têm os campos
//     em snake_case (igual às colunas do PostgreSQL)
//   - Interfaces de payload HTTP têm campos em camelCase
//     (convenção JavaScript/TypeScript)
// ============================================================

// ----------------------------------------------------------
// Workspace
// ----------------------------------------------------------
// Representa um registo completo da tabela workspaces.
// Usado internamente no service e como base para as respostas.
export interface Workspace {
  id: string; // UUID - chave primária
  name: string; // Nome do workspace
  description: string | null; // Descrição opcional
  owner_id: string; // UUID do utilizador que é o dono
  invite_code: string; // Código de convite único (6 chars)
  created_at: string; // Timestamp ISO
}

// ----------------------------------------------------------
// WorkspaceMember
// -----------------------------------------------------------
// Representa um registo da tabela workspace_members.
// enriquecido com os dados do utilizador (resultado de JOIN).
// usado na resposta do endpoint GET /workspaces/:id/members
export interface WorkspaceMember {
  user_id: string; // UUID do utilizador
  workspace_id: string; // UUID do workspace
  role: WorkspaceRole; // Papel do utilizador no workspace
  joined_at: Date; // Quando o utilizador se juntou ao workspace
  name: string; // Nome do utilizador (via JOIN com users)
  email: string; // Email do utilizador (via JOIN com users)
}

// ----------------------------------------------------------
// WorkspaceRole
// ----------------------------------------------------------
// Union type para os papéis possíveis de um membro num workspace.
export type WorkspaceRole = 'owner' | 'admin' | 'member';

// ----------------------------------------------------------
// WorkspaceWithRole
// ----------------------------------------------------------
// Workspace enriquecido com o papel do utilizador atual autenticado.
// Usado na resposta do endpoint GET /workspaces para listar os workspaces
// O cliente precisa de saber o seu role para controlar o que pode ou não fazer
export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole; // Papel do utilizador autenticado neste workspace
}

// ----------------------------------------------------------
// Payload de entrada (Request Bodies)
// ----------------------------------------------------------

// Body no POST /api/workspaces
export interface CreateWorkspacePayload {
  name: string; // Nome do workspace (obrigatório)
  description?: string; // Descrição do workspace (opcional)
}

// Body no POST /api/workspaces/join
export interface JoinWorkspacePayload {
  inviteCode: string; // Código de convite do workspace
}
