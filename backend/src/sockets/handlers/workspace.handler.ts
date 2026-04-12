// ============================================================
// CollabWave — Workspace Socket Handler
// ============================================================
// Este módulo regista os event listeners relacionados com
// workspaces num socket específico.
//
// FUNÇÃO PRINCIPAL: registerWorkspaceHandler(io, socket)
//   Chamada uma vez por socket no evento 'connection'.
//   Regista os listeners para os eventos deste socket.
//
// EVENTOS TRATADOS:
//   workspace:join  → valida membership, entra na room, actualiza presença
//   workspace:leave → sai da room, actualiza presença
//   disconnect      → limpeza automática de todas as rooms/presença
// ============================================================

import db from '../../config/database';
import {
  addUserToPresence,
  removeUserFromPresence,
  removeUserFromAllWorkspaces,
  getOnlineUsers,
} from '../presence.service';
import type { CollabWaveServer, CollabWaveSocket } from '../sockets.types';

// -----------------------------------------------------------
// buildRoomName
// ------------------------------------------------------------
// Helper que destrói o nome da room Socket.io para um workspace específico
function buildRoomName(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

// -----------------------------------------------------------
// isMemberOfWorkspace
// ------------------------------------------------------------
// Verifica se um utilizador é membro de um workspace
// Consulta a tabela workspace_members para validar a associação
async function isMemberOfWorkspace(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  // Knex: SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?
  // .first() devolve o primeiro resultado ou undefined se não houver
  const membership = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();

  // Se membership for undefined → não é membro → devolve false
  return membership !== undefined;
}

// -----------------------------------------------------------
// registerWorkspaceHandler
// -----------------------------------------------------------
// Função principal exportada.
// Regista todos os listeners de workspace num socket específico.
//
// PARÂMETROS:
//   io     — instância do servidor Socket.io (para emitir para rooms)
//   socket — socket do utilizador autenticado (garantido pelo middleware)
//
// PADRÃO DE DESIGN:
//   Cada domínio tem a sua função registerXHandler(io, socket).
//   Chamada uma vez em index.ts dentro do io.on('connection').
export function registerWorkspaceHandler(
  io: CollabWaveServer,
  socket: CollabWaveSocket,
): void {
  // Extrair dados do utilizador do socket (definidos pelo middleware de autenticação)
  const user = socket.data.user; // { id, email, name }

  // ============================================================
  // EVENT: workspace:join
  // ============================================================
  // Chamado quando o cliente quer entrar na room de um workspace.
  // Só após este evento é que o cliente recebe broadcasts desse workspace.
  socket.on('workspace:join', async (payload) => {
    const { workspaceId } = payload;

    // -------------------------------------------
    // 1. Validação do payload
    // -----------------------------------------------------------
    if (!workspaceId || typeof workspaceId !== 'string') {
      // Emitir erro de apenas para este socket
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'workspaceId is required and must be a string.',
      });
      return;
    }

    try {
      // -------------------------------------------
      // 2. Verificar se o utilizador é membro do workspace
      // -----------------------------------------------------------
      const isMember = await isMemberOfWorkspace(workspaceId, user.id);

      if (!isMember) {
        // Utilizador autenticado mas não é membro → emitir erro específico
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'You are not a member of this workspace.',
        });
        return;
      }

      // -----------------------------------------------------------
      // 3. Entrar na room Socket.io do workspace
      // -----------------------------------------------------------
      // socket.join() adiciona este socket à room lógica do Socket.io.
      // A partir deste momento, qualquer emit para esta room
      // chegará a este socket.
      //
      // Uma room pode ter múltiplos sockets (ex: o mesmo utilizador
      // com dois separadores abertos terá dois sockets na mesma room).
      const room = buildRoomName(workspaceId);
      await socket.join(room);

      console.log(
        `[WORKSPACE] ${user.email} joined room ${room} (socket: ${socket.id}`,
      );

      // -----------------------------------------------------------
      // 4. Registar presença no Redis
      // -----------------------------------------------------------
      // Adicionar o userId ao Set de presença do workspace.
      // SADD é idempotente: se o utilizador já está no Set
      // (ex: segundo separador), não cria duplicados.
      await addUserToPresence(workspaceId, user.id);

      // -----------------------------------------------------------
      // 5. Obter lista atualizada de utilizadores online
      // -----------------------------------------------------------
      // Busca os ids do Redis + detalhes da BD
      const onlineUsers = await getOnlineUsers(workspaceId);

      // -----------------------------------------------------------
      // 6. Emitir workspace:presence_update para todos os sockets na room
      // -----------------------------------------------------------
      // io.to(room).emit() envia para todos os sockets que estão na room,
      // incluindo o que acabou de entrar.

      io.to(room).emit('workspace:presence_update', { onlineUsers });

      console.log(
        `[PRESENCE] workspace ${workspaceId} - ${onlineUsers.length} users online`,
      );
    } catch (error) {
      // Erro inesperado → emitir erro genérico para este socket
      console.error(`[WORKSPACE] Error in workspace:join -`, error);
      socket.emit('error', {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred while joining the workspace.',
      });
    }
  });

  // ============================================================
  // EVENT: workspace:leave
  // ============================================================
  // Chamado quando o cliente quer sair da room de um workspace.
  socket.on('workspace:leave', async (payload) => {
    const { workspaceId } = payload;

    if (!workspaceId || typeof workspaceId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'workspaceId is required and must be a string.',
      });
      return;
    }

    try {
      const room = buildRoomName(workspaceId);

      // --------------------------------------------
      // 1. Sair da room Socket.io
      // --------------------------------------------
      // socket.leave() remove este socket da room lógica do Socket.io.
      await socket.leave(room);

      // --------------------------------------------
      // 2. Remover presença do Redis
      // --------------------------------------------
      // Remove o userId do Set de presença do workspace.
      await removeUserFromPresence(workspaceId, user.id);

      // --------------------------------------------
      // 3. Obter lista atualizada de utilizadores online
      // --------------------------------------------
      const onlineUsers = await getOnlineUsers(workspaceId);
      io.to(room).emit('workspace:presence_update', { onlineUsers });

      console.log(
        `[WORKSPACE] ${user.email} left room ${room} (socket: ${socket.id}`,
      );
    } catch (error) {
      console.error(`[WORKSPACE] Error on workspace:leave -`, error);
      socket.emit('error', {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred while leaving the workspace.',
      });
    }
  });

  // ============================================================
  // EVENT: disconnect
  // ============================================================
  // Disparado automaticamente pelo Socket.io quando a conexão
  // TCP é encerrada (browser fecha, rede cai, timeout de ping).
  //
  // DIFERENÇA FACE A workspace:leave:
  //   workspace:leave é voluntário e específico a um workspace.
  //   disconnect é automático e afecta TODAS as rooms deste socket.

  socket.on('disconnect', async (reason) => {
    console.log(
      `[WORKSPACE] Cleaning up presence for ${user.email} reason: ${reason}`,
    );

    try {
      // ---------------------------------------------
      // 1. Remover o utilizador de todos os workspaces no Redis
      // ---------------------------------------------
      // removeUserFromAllWorkspaces devolve os worskspacesIds
      // de onde o utilizador foi removido.
      // Precisamos desta lista para emitir os updates de presença corretos.
      const affectedWorkspacesIds = await removeUserFromAllWorkspaces(user.id);

      // ---------------------------------------------
      // 2. Notificar cada workspace afetado sobre a atualização de presença
      // ---------------------------------------------
      for (const workspaceId of affectedWorkspacesIds) {
        const room = buildRoomName(workspaceId);
        const onlineUsers = await getOnlineUsers(workspaceId);

        // io.to(room).emit() envia para todos os sockets que estão na room,
        // exceto para o socket que se desconectou (que já não está na room).
        io.to(room).emit('workspace:presence_update', { onlineUsers });

        console.log(
          `[PRESENCE] workspace ${workspaceId} updated after disconnect -`,
          `${onlineUsers.length} user(s) remaining`,
        );
      }
    } catch (error) {
      // Erro no cleanup de disconnect → apenas logar, não há socket para emitir erros
      console.error(`[WORKSPACE] Error during disconnect cleanup:`, error);
    }
  });
}
