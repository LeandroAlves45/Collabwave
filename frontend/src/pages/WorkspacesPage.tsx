// src/pages/WorkspacesPage.tsx
// Página de workspaces. Mostra a lista de workspaces do utilizador e permite criar novos.

import type { ReactElement } from 'react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
//import ApiClient from '@/services/api'
import { useNavigate } from 'react-router-dom'
import { type Workspace } from '@/types/workspace'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus } from 'lucide-react'

// Interface para workspace com role (vem do backend depois)
// Por agora usamos mock data com a mesma estrutura
interface WorkspaceWithRole extends Workspace {
  role: 'owner' | 'admin' | 'member';
}

// WorkspacesPage: dashboard principal após autenticação
// Mostra lista de workspaces do utilizador com opções de criar/entrar
// TODO: Passo 6 iremos inserir API call
export function WorkspacePage(): ReactElement {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Estados locais para modais de criar/entrar workspace
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  // Campos de formulário: nome do workspace a criar e invite code para entrar
  const [createWorkspaceName, setCreateWorkspaceName] = useState('')
  const [joinInviteCode, setJoinInviteCode] = useState('')

  // Mock data: 4 workspaces de exemplo com roles diferentes
  // Estrutura: id, name, description, owner_id, invite_code, created_at, role
  // TODO: Isto será substituído por fetch do backend no Passo 6
  const mockWorkspaces: WorkspaceWithRole[] = [
    {
      id: '1',
      name: 'Project Alpha',
      description: 'Workspace para o Projeto Alpha',
      ownerId: '123',
      inviteCode: 'ALPHA123',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'owner',
    },
    {
      id: '2',
      name: 'Design Team',
      description: 'Equipe de design da empresa',
      ownerId: '456',
      inviteCode: 'DESIGN456',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'admin',
    },
    {
      id: '3',
      name: 'Marketing',
      description: 'Departamento de marketing',
      ownerId: '789',
      inviteCode: 'MARKET789',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'member',
    },
  ];

  // Handler: abre workspace ao clicar no Card
  // TODO: será chamada real quando o socket.io/workspace service estiver implementado
  const handleOpenWorkspace = (workspaceId: string): void => {
    navigate(`/board/${workspaceId}`);
  };

  // Handler: submete formulário de criação de workspace
  // TODO: será chamada ApiClient.createWorkspace() no passo 6
  const handleCreateWorkspace = (): void => {
    if (createWorkspaceName.trim()) {
      alert('Nome do Workspace é obrigatório.')
      return;
    }

    // Placeholder: será substituído por API call
    //const newWorkspace = await ApiClient.createWorkspace({ name: createWorkspaceName });
    console.log('Create workspace:', createWorkspaceName);

    // Fecha modal e limpa campos
    setShowCreateModal(false)
    setCreateWorkspaceName('')
  };

  // Handler: submete formulário de entrar em workspace com invite code
  // TODO: será substituído por chamada real à API para entrar em workspace
  const handleJoinWorkspace = (): void => {
    if (!joinInviteCode.trim()) {
      alert('Código de convite é obrigatório.')
      return;
    }

    // Placeholder: será substituído por API call
    //const workspace = await ApiClient.joinWorkspace({ inviteCode: joinInviteCode });
    console.log('Join Workspace:', joinInviteCode);

    // Fecha modal e limpa campos
    setShowJoinModal(false)
    setJoinInviteCode('')
  };

  // Função auxiliar: retorna cor de badge baseado no role
  // owner -> verde (cw-accent), admin -> amarelo, member -> cinza
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'bg-cw-accent text-black';
      case 'admin':
        return 'bg-yellow-400 text-black';
      case 'member':
        return 'bg-cw-border text-cw-text-secondary';
      default:
        return 'bg-cw-border text-cw-text-secondary';
    }
  };

  // Função auxiliar: retorna label em português para o role
  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'member': 'Membro',
    };
    return roleMap[role] || role;
    };

    // Função auxiliar: formata data para formato legível (ex: "Há 2 dias")
    const formatDate = (isoDate: string): string => {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Há 1 dia';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
      return `Há ${Math.floor(diffDays / 30)} meses`;
    };

  return (
    <div className="min-h-screen bg-cw-bg-primary py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header com saudação e botões de ação */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-cw-text-primary mb-2">
              Workspaces
            </h1>
            {/* Saudação personalizada ao utilizador autenticado */}
            <p className="text-cw-text-secondary">
              Bem-vindo, <span className="font-medium">{user?.name}</span>
            </p>
          </div>

          {/* Botões de ação: criar e entrar em workspace */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-cw-accent text-black hover:bg-cw-accent/90"
            >
              <Plus size={18} />
              Criar Workspace
            </Button>
            <Button
              onClick={() => setShowJoinModal(true)}
              variant="outline"
            >
              Entrar com Código
            </Button>
          </div>
        </div>

        {/* Grid de workspaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockWorkspaces.map((workspace) => (
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
                {/* Badge mostra role com cor diferente para cada tipo */}
                <span className={`text-xs font-medium px-2 py-1 rounded ${getRoleBadgeColor(workspace.role)}`}>
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
                  <span className="font-mono text-cw-accent">{workspace.inviteCode}</span>
                </div>
                <div>
                  <span className="text-cw-text-secondary">Criado </span>
                  <span>{formatDate(workspace.createdAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal: Criar novo workspace */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-cw-text-primary mb-4">
                Criar Novo Workspace
              </h2>

              {/* Input para nome do workspace */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-cw-text-primary mb-2">
                  Nome do Workspace
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Projeto Q2"
                  value={createWorkspaceName}
                  onChange={(e) => setCreateWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Botões de ação do modal */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateWorkspace}
                  className="flex-1 bg-cw-accent text-black hover:bg-cw-accent/90"
                >
                  Criar
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
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

              {/* Input para invite code */}
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
                />
              </div>

              {/* Botões de ação do modal */}
              <div className="flex gap-3">
                <Button
                  onClick={handleJoinWorkspace}
                  className="flex-1 bg-cw-accent text-black hover:bg-cw-accent/90"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => setShowJoinModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
