// src/components/layout/AuthLayout.tsx
// Layout para páginas de autenticação (login, register)
// Centraliza o conteúdo e mostra o logo da aplicação

import type { ReactElement } from 'react'
import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'

// Layout para as páginas públicas de autenticação (login, register)
// Centra o contéudo na viewport e mostra o logo da aplicação
export function AuthLayout(): ReactElement {
  return (
    <div className="min-h-screen bg-cw-base flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo size="md" />
      </div>

      <Outlet />
    </div>
  )
}
