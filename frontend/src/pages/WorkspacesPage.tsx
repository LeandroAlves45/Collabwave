// src/pages/WorkspacesPage.tsx
// Dashboard principal após autenticação.
// Lista workspaces do utilizador, permite criar/entrar em workspaces.

import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import ApiClient from '@/services/api'
import { useWorkspaceStore, type WorkspaceWithRole } from '@/stores/workspaceStore'
import { useNavigate } from 'react-router-dom'
import SocketService from '@/services/socket'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, LogOut } from 'lucide-react'


// WorkspacesPage: dashboard principal após autenticação
// Mostra lista de workspaces do utilizador com opções de criar/entrar
export function WorkspacesPage(): ReactElement {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Workspace Store
  const {
    workspaces,
    isLoading,
    error,
    setWorkspaces,
    setLoading,
    setError,
  } = useWorkspaceStore()


  // Estados locais para modais de criar/entrar workspace
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  // Campos de formulário: nome do workspace a criar e invite code para entrar
  const [createWorkspaceName, setCreateWorkspaceName] = useState('')
  const [createWorkspaceDescription, setCreateWorkspaceDescription] = useState('')
  const [joinInviteCode, setJoinInviteCode] = useState('')

  
  // ========== EFEITO: CARREGAR WORKSPACES AO MONTAR ==========
  /**
   * Ao montar componente:
   * 1. Carrega lista de workspaces do backend
   * 2. Conecta ao Socket.io se não conectado
   * 3. Regista listeners de eventos Socket.io
   */

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true)
        setError(null)

        // Chama API para obter lista de workspaces do utilizador autenticado
        const data = await ApiClient.listWorkspaces()

        // Armazena no Zustand store
        setWorkspaces(data as WorkspaceWithRole[])

        console.log('[WorkspacesPage]Workspaces carregados:', data.length)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao carregar workspaces'
        setError(errorMessage)
        console.error('[WorkspacesPage]Erro ao carregar workspaces:', err)
      } finally {
        setLoading(false)
      }
    }

    // Carrega workspaces ao montar
    loadWorkspaces()

    // Conecta Socket.io se não conectado
    if (!SocketService.isConnected()) {
      SocketService.connect()
    }

  }, [setWorkspaces, setLoading, setError])

  // Handler: LOGOUT
  /**
   * Termina sessão do utilizador.
   * useAuth.logout() desconecta Socket.io automaticamente.
   */
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Handler: abre workspace ao clicar no Card
  /**
   * Navega para BoardPage do workspace selecionado.
   */
  const handleOpenWorkspace = (workspaceId: string): void => {
    navigate(`/board/${workspaceId}`);
  }

  // Handler: Criar workspace
  /**
   * Cria novo workspace via API.
   * Após sucesso, adiciona workspace à lista local.
   */
  const handleCreateWorkspace = async () => {
    // Validação simples
    if (!createWorkspaceName.trim()) {
      alert('Nome do Workspace é obrigatório.')
      return;
    }

    try {
      setLoading(true)

      // Chama API para criar novo workspace
      const newWorkspace = await ApiClient.createWorkspace({
        name: createWorkspaceName.trim(),
        description: createWorkspaceDescription.trim() || undefined,
      })

      // Adiciona workspace à lista local
      setWorkspaces([...workspaces, newWorkspace as WorkspaceWithRole])

      console.log('[WorkspacesPage]Workspace criado:', newWorkspace.name)

      // Fecha modal e limpa campos
      setShowCreateModal(false)
      setCreateWorkspaceName('')
      setCreateWorkspaceDescription('')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao criar workspace'
      setError(errorMessage)
      console.error('[WorkspacesPage]Erro ao criar workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handler: submete formulário de entrar em workspace com invite code
  const handleJoinWorkspace = async () => {
    if (!joinInviteCode.trim()) {
      alert('Código de convite é obrigatório.')
      return;
    }

    try {
      setLoading(true)

      // Chama API para entrar em workspace
      const workspace = await ApiClient.joinWorkspace({
        inviteCode: joinInviteCode.trim(),
      })

      // Adiciona workspace à lista local
      setWorkspaces([...workspaces, workspace as WorkspaceWithRole])

      console.log('[WorkspacesPage]Entrou em workspace:', workspace.name)

      // Fecha modal e limpa campo
      setShowJoinModal(false)
      setJoinInviteCode('')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao entrar em workspace'
      setError(errorMessage)
      console.error('[WorkspacesPage]Erro ao entrar em workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  // Função auxiliar: retorna cor de badge baseado no role
  // owner -> verde (cw-accent), admin -> amarelo, member -> cinza
  const getRoleBadgeColor = (role: 'owner' | 'admin' | 'member'): string => {
    switch (role) {
      case 'owner':
        return 'bg-cw-accent text-black'
      case 'admin':
        return 'bg-yellow-400 text-black'
      case 'member':
        return 'bg-cw-border text-cw-text-secondary'
    }
  }

  // Função auxiliar: retorna label em português para o role
  const getRoleLabel = (role: 'owner' | 'admin' | 'member'): string => {
    const roleMap: Record<'owner' | 'admin' | 'member', string> = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'member': 'Membro',
    }
    return roleMap[role]
  }

  // Função auxiliar: formata data para formato legível (ex: "Há 2 dias")
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Há 1 dia'
    if (diffDays < 7) return `Há ${diffDays} dias`
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`
    return `Há ${Math.floor(diffDays / 30)} meses`
  }

  return (
    <div className="min-h-screen bg-cw-bg-primary py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header com saudação e botões de ação */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-cw-text-primary mb-2">
              Workspaces
            </h1>
            <p className="text-cw-text-secondary">
              Bem-vindo, <span className="font-medium">{user?.name}</span>
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-cw-accent text-black hover:bg-cw-accent/90"
              disabled={isLoading}
            >
              <Plus size={18} />
              Criar Workspace
            </Button>
            <Button
              onClick={() => setShowJoinModal(true)}
              variant="outline"
              disabled={isLoading}
            >
              Entrar com Código
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>

        {/* Mensagem de erro global */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && workspaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-cw-text-secondary">A carregar workspaces...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && workspaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-cw-text-secondary mb-4">
              Ainda não tens workspaces.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-cw-accent text-black hover:bg-cw-accent/90"
            >
              Criar Primeiro Workspace
            </Button>
          </div>
        )}

        {/* Grid de workspaces */}
        {workspaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className="p-4 cursor-pointer hover:bg-cw-bg-secondary transition-colors"
                onClick={() => handleOpenWorkspace(workspace.id)}
              >
                {/* Header do card: nome + badge de role */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-cw-text-primary flex-1">
                    {workspace.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getRoleBadgeColor(workspace.role)}`}
                  >
                    {getRoleLabel(workspace.role)}
                  </span>
                </div>

                {/* Descrição do workspace (se existir) */}
                {workspace.description && (
                  <p className="text-sm text-cw-text-secondary mb-3 line-clamp-2">
                    {workspace.description}
                  </p>
                )}

                {/* Footer do card: invite code + data de criação */}
                <div className="text-xs text-cw-text-secondary space-y-1 border-t border-cw-border pt-3">
                  <div>
                    <span className="text-cw-text-secondary">Código: </span>
                    <span className="font-mono text-cw-accent">
                      {workspace.inviteCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-cw-text-secondary">Criado </span>
                    <span>{formatDate(workspace.createdAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Criar novo workspace */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-cw-text-primary mb-4">
                Criar Novo Workspace
              </h2>

              <div className="space-y-4">
                {/* Campo: Nome do workspace */}
                <div>
                  <label className="block text-sm font-medium text-cw-text-primary mb-2">
                    Nome do Workspace *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Projeto Q2"
                    value={createWorkspaceName}
                    onChange={(e) => setCreateWorkspaceName(e.target.value)}
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                {/* Campo: Descrição (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-cw-text-primary mb-2">
                    Descrição (opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Breve descrição do workspace"
                    value={createWorkspaceDescription}
                    onChange={(e) => setCreateWorkspaceDescription(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleCreateWorkspace}
                  className="flex-1 bg-cw-accent text-black hover:bg-cw-accent/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'A criar...' : 'Criar'}
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal: Entrar em workspace com invite code */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-cw-text-primary mb-4">
                Entrar em Workspace
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-cw-text-primary mb-2">
                  Código de Convite
                </label>
                <Input
                  type="text"
                  placeholder="Ex: ABC123"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  autoFocus
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3">
                <Button
                  onClick={handleJoinWorkspace}
                  className="flex-1 bg-cw-accent text-black hover:bg-cw-accent/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'A entrar...' : 'Entrar'}
                </Button>
                <Button
                  onClick={() => setShowJoinModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
