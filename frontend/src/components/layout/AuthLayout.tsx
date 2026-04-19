// src/components/layout/AuthLayout.tsx
// Layout para páginas de autenticação (login, register)
// Centraliza o conteúdo e mostra o logo da aplicação

import type { ReactElement } from 'react'
import { Outlet } from 'react-router-dom'

// Layout para as páginas públicas de autenticação (login, register).
// As páginas controlam o seu próprio alinhamento e conteúdo visual.
export function AuthLayout(): ReactElement {
  return (
    // Wrapper minimo: login/register controlam card, logo e alinhamento de forma independente.
    <div className="min-h-screen bg-cw-bg-primary">
      <Outlet />
    </div>
  )
}
