// Tipos de workspaces. Registos da BD usam snake_case; payloads usam camelCase.
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  joined_at: Date;
  name: string;
  email: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

export interface JoinWorkspacePayload {
  inviteCode: string;
}
