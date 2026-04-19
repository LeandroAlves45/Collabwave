// frontend/src/stores/workspaceStore.ts
// File destinado a guardar o estado global relacionado a workspaces.
// Armazena a lista de workspaces do utilizador, detalhes do workspace selecionado, etc.

import { create } from 'zustand'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/workspace'

// Interface para workspace com role do utilizador atual
// Necessário saber se o utilizador é owner/admin/member para mostrar opções corretas na UI
export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole
}

interface WorkspaceState {
  // Workspace atualmente selecionado (null se nenhum selecionado)
  // Carregado quando o utilizador clica em workspace na WorkspacesPage
  currentWorkspace: WorkspaceWithRole | null

  // Lista de todos os workspaces do utilizador
  workspaces: WorkspaceWithRole[]

  // Lista de membros do workspace atual
  // Carregada quando workspace é seleccionado
  members: WorkspaceMember[]

  // Estado de carregamento
  isLoading: boolean

  // Mensagem de erro (ex: falha ao carregar membros)
  error: string | null

  // ========== AÇÕES ==========

  // Define o workspace atual
  setCurrentWorkspace: (workspace: WorkspaceWithRole | null) => void

  // Atualiza lista de workspaces
  setWorkspaces: (workspaces: WorkspaceWithRole[]) => void

  // Adiciona ou atualiza um workspace sem duplicar por id
  addWorkspace: (workspace: WorkspaceWithRole) => void

  // Atualiza lista de membros do workspace atual
  setMembers: (members: WorkspaceMember[]) => void

  // Define estado de carregamento
  setLoading: (loading: boolean) => void

  // Define mensagem de erro
  setError: (error: string | null) => void

  // Limpa tudo após Logout
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  // ========== ESTADO INICIAL ==========
  currentWorkspace: null,
  workspaces: [],
  members: [],
  isLoading: false,
  error: null,

  // ========== AÇÕES ==========

  // Define workspace atual quando utilizador clica em um Card
  setCurrentWorkspace: (workspace: WorkspaceWithRole | null): void => {
    set({ currentWorkspace: workspace, error: null })
  },

  // Atualiza lista de workspaces do utilizador (chamado após carregar workspaces)
  setWorkspaces: (workspaces: WorkspaceWithRole[]): void => {
    set({ workspaces, error: null })
  },

  // Adiciona workspace novo ou substitui o existente com o mesmo id
  addWorkspace: (workspace: WorkspaceWithRole): void => {
    set((state) => {
      const exists = state.workspaces.some((item) => item.id === workspace.id)

      return {
        workspaces: exists
          ? state.workspaces.map((item) =>
              item.id === workspace.id ? workspace : item
            )
          : [...state.workspaces, workspace],
        error: null,
      }
    })
  },

  // Atualiza lista de membros do workspace atual (chamado após carregar membros)
  setMembers: (members: WorkspaceMember[]): void => {
    set({ members, error: null })
  },

  // Define estado de carregamento (mostrado ao utilizador na UI)
  setLoading: (loading: boolean): void => set({ isLoading: loading }),

  // Define mensagem de erro (mostrada ao utilizador se falhar carregar dados)
  setError: (error: string | null): void => set({ error }),

  // Limpa tudo: chamado quando o utilizador faz Logout
  reset: (): void =>
    set({
      currentWorkspace: null,
      workspaces: [],
      members: [],
      isLoading: false,
      error: null,
    }),
}))
