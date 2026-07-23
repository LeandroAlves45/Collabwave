// src/components/common/Header.tsx
// Header global da aplicação com logo e informações do utilizador

import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/common/Logo'
import { ConnectionStatus } from '@/components/common/ConnectionStatus'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import { cn } from '@/utils/cn'

interface HeaderProps {
  workspaceName?: string // Nome do workspace atual (opcional)
  className?: string
  onLogout?: () => void | Promise<void>
}

export function Header({ workspaceName, className, onLogout }: HeaderProps) {
  // RootLayout pode injetar um logout que tambem limpa o estado dos workspaces.
  const { user, logout } = useAuth()

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-4 border-b border-cw-border bg-cw-bg-secondary px-6',
        className
      )}
    >
      {/* Logo e nome do workspace */}
      <div className="flex items-center gap-4">
        <Logo size="md" />

        {workspaceName && (
          <span className="border-l border-cw-border pl-4 text-sm text-cw-text-secondary">
            {workspaceName}
          </span>
        )}
      </div>

      {/* Info do utilizador */}
      {user && (
        <div className="ml-auto flex items-center gap-3">
          <ConnectionStatus />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cw-accent text-xs font-bold text-[#041119]">
            {user.name?.charAt(0).toUpperCase() ?? 'U'}
          </span>
          <span className="text-sm text-cw-text-secondary">{user.name}</span>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLogout ?? logout}
            aria-label="Log out"
          >
            <LogOut size={16} />
          </Button>
        </div>
      )}
    </header>
  )
}

Header.displayName = 'Header'
