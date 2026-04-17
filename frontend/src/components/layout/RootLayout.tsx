// src/components/layout/RootLayout.tsx
// Layout para as páginas protegidas (workspace, board)
// Fornece o shell da aplicação (sidebar, header, etc.) e renderiza o conteúdo das páginas

import type { ReactElement } from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

// Shell para todas as páginas autenticadas
// Composta por header fixo + área de conteúdo via <Outlet />
// TODO: adicionar sidebar, etc. conforme necessário
export function RootLayout(): ReactElement {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  function handleLogout(): void {
    // Limpa o estado do store -> o ProtectedRoute irá redirecionar para /login
    // A chamada a POST /api/auth/logout (invalidar o refresh token no Redis)
    useAuthStore.setState({ user: null, accessToken: null })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-cw-base flex flex-col">
      {/* Header fixo no topo */}
      <header className="h-14 border-b border-cw-border bg-cw-surface flex items-center px-6 gap-4 shrink-0">
        {/* Logo leva de volta à lista de workspaces */}
        <Link to="/">
          <Logo size="sm" />
        </Link>

        {/* Nome do utilizador + botão de logout alinhados à direita */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-cw-secondary">{user?.name}</span>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut size={14} />
          </Button>
        </div>
      </header>

      {/* Área de conteúdo: ocupa o restante da viewport */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}