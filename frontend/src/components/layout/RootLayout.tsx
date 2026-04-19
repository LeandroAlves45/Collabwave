// src/components/layout/RootLayout.tsx
// Layout para paginas protegidas, como workspaces e board.

import type { ReactElement } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from '@/components/common/Header'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuth } from '@/hooks/useAuth'

// Shell para todas as paginas autenticadas.
export function RootLayout(): ReactElement {
  // Este layout assume que ProtectedRoute ja validou a sessao antes de renderizar o Outlet.
  const { logout } = useAuth()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const resetWorkspaces = useWorkspaceStore((state) => state.reset)
  const navigate = useNavigate()

  async function handleLogout(): Promise<void> {
    // Ordem importante: invalida auth primeiro, depois limpa dados derivados de workspaces.
    await logout()
    resetWorkspaces()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-cw-bg-primary">
      <Header workspaceName={currentWorkspace?.name} onLogout={handleLogout} />

      {/* Area de conteudo: deixa cada pagina decidir o proprio scroll interno. */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
