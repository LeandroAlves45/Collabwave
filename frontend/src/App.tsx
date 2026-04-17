import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuthStore } from "./stores/authStore";
import { AuthLayout } from "./components/layout/AuthLayout";
import { RootLayout } from "./components/layout/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WorkspacePage } from "./pages/WorkspacesPage";
import { BoardPage } from "./pages/BoardPage";

// ProtectedRoute é uma layout route sem path
// Lê o estado de autenticação do store e redireciona se não houver utilizador 
function ProtectedRoute(): ReactElement {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    // replace: true evita que /login fique no histórico do navegação
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas: AuthLayout centra o contéudo e mostra o Logo */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Rotas protegidas: RootLayout fornece o shell, ProtectedRoute verifica auth */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RootLayout />}>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/board/:id" element={<BoardPage />} />
          </Route>
        </Route>

        {/* Rota catch-all para redirecionar para a página inicial */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}