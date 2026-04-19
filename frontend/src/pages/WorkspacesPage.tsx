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
import { WorkspaceCard } from '@/components/common/WorkspaceCard'
import { WaveLine } from '@/components/common/WaveLine'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, X, Loader2, Copy, Check } from 'lucide-react'

// WorkspacesPage: dashboard principal após autenticação
// Mostra lista de workspaces do utilizador com opções de criar/entrar
export function WorkspacesPage(): ReactElement {
  const navigate = useNavigate()
  useAuth()

  // Workspace Store
  const {
    workspaces,
    isLoading,
    error,
    setWorkspaces,
    addWorkspace,
    setCurrentWorkspace,
    setLoading,
    setError,
  } = useWorkspaceStore()

  // Estado para criar workspace
  const [isCreating, setIsCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')

  // Estado para entrar em workspace
  const [isJoining, setIsJoining] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  // Estado para partilhar o invite code de um workspace
  const [inviteWorkspace, setInviteWorkspace] = useState<WorkspaceWithRole | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

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
        // Lista inicial e fonte da verdade antes de qualquer criacao/entrada local.
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
    // Mantem o socket preparado para eventos em tempo real nas paginas seguintes.
    if (!SocketService.isConnected()) {
      SocketService.connect()
    }
  }, [setWorkspaces, setLoading, setError])

  // Handler: abre workspace ao clicar no Card
  /**
   * Navega para BoardPage do workspace selecionado.
   */
  const handleOpenWorkspace = (workspace: WorkspaceWithRole): void => {
    setCurrentWorkspace(workspace)
    navigate(`/board/${workspace.id}`)
  }

  const handleOpenInviteModal = (workspace: WorkspaceWithRole): void => {
    setInviteWorkspace(workspace)
    setCopyStatus('idle')
  }

  const handleCloseInviteModal = (): void => {
    setInviteWorkspace(null)
    setCopyStatus('idle')
  }

  const handleCopyInviteCode = async (): Promise<void> => {
    if (!inviteWorkspace?.inviteCode) return

    try {
      await navigator.clipboard.writeText(inviteWorkspace.inviteCode)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  // Handler: Criar workspace
  /**
   * Cria novo workspace via API.
   * Após sucesso, adiciona workspace à lista local.
   */
  const handleCreateWorkspace = async () => {
    // Validação simples
    if (!createName.trim()) {
      alert('Nome do Workspace é obrigatório.')
      return
    }

    try {
      setLoading(true)

      // Chama API para criar novo workspace
      const newWorkspace = await ApiClient.createWorkspace({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      })

      // Adiciona workspace à lista local
      // Atualizacao local: assume que a API devolve o workspace completo.
      addWorkspace(newWorkspace as WorkspaceWithRole)

      console.log('[WorkspacesPage]Workspace criado:', newWorkspace.name)

      // Fecha modal e limpa campos
      setCreateName('')
      setCreateDescription('')
      setIsCreating(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar workspace'
      setError(errorMessage)
      console.error('[WorkspacesPage]Erro ao criar workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handler: Cancela a criação do workspace (fecha modal e limpa campos)
  const handleCancelCreate = () => {
    setCreateName('')
    setCreateDescription('')
    setIsCreating(false)
  }

  // Handler: Entra no workspace usando código de convite
  /**
   * Valida código de convite, chama API para entrar em workspace.
   * Após sucesso, adiciona workspace à lista local.
   */
  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) {
      alert('Código de convite é obrigatório.')
      return
    }

    try {
      setLoading(true)

      // Chama API para entrar em workspace
      const workspace = await ApiClient.joinWorkspace({
        inviteCode: joinCode.trim(),
      })

      // Adiciona workspace à lista local
      // Atualizacao local apos join; o store evita duplicados por id.
      addWorkspace(workspace as WorkspaceWithRole)

      console.log('[WorkspacesPage]Entrou em workspace:', workspace.name)

      // Fecha modal e limpa campo
      setJoinCode('')
      setIsJoining(false)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao entrar em workspace'
      setError(errorMessage)
      console.error('[WorkspacesPage]Erro ao entrar em workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handler: Cancel join workspace (fecha modal e limpa campo)
  const handleCancelJoin = () => {
    setJoinCode('')
    setIsJoining(false)
  }

  // Loading state
  if (isLoading && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cw-base">
        <Loader2 className="h-8 w-8 animate-spin text-cw-wave" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-cw-base">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-cw-primary">
              Your Workspaces
            </h1>
            <p className="text-sm text-cw-muted mt-1">
              Select a workspace to start collaborating
            </p>
          </div>

          {!isCreating && !isJoining && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
              <Button
                onClick={() => setIsJoining(true)}
                variant="outline"
                className="border-cw-border text-cw-primary hover:bg-cw-surface"
              >
                Join Code
              </Button>
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 rounded-md border border-cw-error/40 bg-cw-error/10 p-3 text-sm text-cw-error">
            {error}
          </div>
        )}

        {/* Form de criar workspace */}
        {isCreating && (
          <div className="bg-cw-surface border-thin border-cw-border rounded-lg p-4 mb-6">
            <WaveLine isActive className="mb-4" />
            <h2 className="font-heading font-bold text-lg text-cw-primary mb-4">
              Create New Workspace
            </h2>
            <div className="space-y-3">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
                className="bg-cw-base border-cw-border"
                disabled={isLoading}
              />
              <Input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Description (optional)"
                className="bg-cw-base border-cw-border"
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={!createName.trim() || isLoading}
                  className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelCreate}
                  className="text-cw-muted hover:text-cw-secondary hover:bg-cw-base"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Form de entrar em workspace */}
        {isJoining && (
          <div className="bg-cw-surface border-thin border-cw-border rounded-lg p-4 mb-6">
            <WaveLine isActive className="mb-4" />
            <h2 className="font-heading font-bold text-lg text-cw-primary mb-4">
              Join Workspace
            </h2>
            <p className="text-sm text-cw-muted mb-4">
              Enter the invite code to join an existing workspace
            </p>
            <div className="space-y-3">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g. ABC123)"
                autoFocus
                className="bg-cw-base border-cw-border font-mono"
                disabled={isLoading}
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleJoinWorkspace}
                  disabled={!joinCode.trim() || isLoading}
                  className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
                >
                  Join
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelJoin}
                  className="text-cw-muted hover:text-cw-secondary hover:bg-cw-base"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {inviteWorkspace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg border border-cw-border bg-cw-surface p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-lg font-bold text-cw-primary">
                    Share invite
                  </h2>
                  <p className="mt-1 text-sm text-cw-muted">
                    Send this code to someone you want to invite to {inviteWorkspace.name}.
                  </p>
                </div>
                <button
                  onClick={handleCloseInviteModal}
                  className="rounded-md p-1 text-cw-muted hover:text-cw-primary focus:outline-none focus:ring-2 focus:ring-cw-wave/50"
                  aria-label="Close invite modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-lg border border-cw-border bg-cw-base p-4">
                <p className="mb-2 text-xs font-medium uppercase text-cw-muted">
                  Invite code
                </p>
                <div className="flex items-center justify-between gap-3">
                  <code className="font-mono text-2xl font-bold tracking-widest text-cw-primary">
                    {inviteWorkspace.inviteCode || '------'}
                  </code>
                  <Button
                    onClick={handleCopyInviteCode}
                    disabled={!inviteWorkspace.inviteCode}
                    className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
                  >
                    {copyStatus === 'copied' ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-sm text-cw-muted">
                The other person should sign in, choose Join Code, and paste this code.
              </p>

              {copyStatus === 'error' && (
                <p className="mt-3 text-sm text-cw-error">
                  Could not copy automatically. Select the code and copy it manually.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grid de workspaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => handleOpenWorkspace(workspace)}
              onShare={handleOpenInviteModal}
            />
          ))}
        </div>

        {/* Empty state */}
        {workspaces.length === 0 && !isCreating && !isJoining && (
          <div className="text-center py-12">
            <p className="text-cw-muted mb-4">No workspaces yet</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first workspace
              </Button>
              <Button
                onClick={() => setIsJoining(true)}
                variant="outline"
                className="border-cw-border text-cw-primary hover:bg-cw-surface"
              >
                Join with code
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
