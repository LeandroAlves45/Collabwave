// Eventos Socket.io de workspaces: rooms, membership e presenca.

import db from '../../config/database';
import {
  addUserToPresence,
  removeUserFromPresence,
  removeUserFromAllWorkspaces,
  getOnlineUsers,
} from '../presence.service';
import type { CollabWaveServer, CollabWaveSocket } from '../sockets.types';

function buildRoomName(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

async function isMemberOfWorkspace(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const membership = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();

  return membership !== undefined;
}

export function registerWorkspaceHandler(
  io: CollabWaveServer,
  socket: CollabWaveSocket,
): void {
  const user = socket.data.user;

  socket.on('workspace:join', async (payload) => {
    const { workspaceId } = payload;

    if (!workspaceId || typeof workspaceId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'workspaceId is required and must be a string.',
      });
      return;
    }

    try {
      const isMember = await isMemberOfWorkspace(workspaceId, user.id);

      if (!isMember) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'You are not a member of this workspace.',
        });
        return;
      }

      const room = buildRoomName(workspaceId);
      await socket.join(room);

      console.log(`[WORKSPACE] Client joined room ${room} (socket: ${socket.id})`);

      await addUserToPresence(workspaceId, user.id, socket.id);

      const onlineUsers = await getOnlineUsers(workspaceId);

      io.to(room).emit('workspace:presence_update', { onlineUsers });

      console.log(
        `[PRESENCE] workspace ${workspaceId} - ${onlineUsers.length} users online`,
      );
    } catch (error) {
      console.error(`[WORKSPACE] Error in workspace:join -`, error);
      socket.emit('error', {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred while joining the workspace.',
      });
    }
  });

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

      await socket.leave(room);

      await removeUserFromPresence(workspaceId, user.id, socket.id);

      const onlineUsers = await getOnlineUsers(workspaceId);
      io.to(room).emit('workspace:presence_update', { onlineUsers });

      console.log(`[WORKSPACE] Client left room ${room} (socket: ${socket.id})`);
    } catch (error) {
      console.error(`[WORKSPACE] Error on workspace:leave -`, error);
      socket.emit('error', {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred while leaving the workspace.',
      });
    }
  });

  socket.on('disconnect', async (reason) => {
    console.log(`[WORKSPACE] Cleaning up presence, reason: ${reason}`);

    try {
      const result = await removeUserFromAllWorkspaces(user.id, socket.id);

      // Defesa para mocks que devolvem undefined apos clearAllMocks().
      const affectedWorkspacesIds = Array.isArray(result) ? result : [];

      for (const workspaceId of affectedWorkspacesIds) {
        const room = buildRoomName(workspaceId);
        const onlineUsers = await getOnlineUsers(workspaceId);

        io.to(room).emit('workspace:presence_update', { onlineUsers });

        console.log(
          `[PRESENCE] workspace ${workspaceId} updated after disconnect -`,
          `${onlineUsers.length} user(s) remaining`,
        );
      }
    } catch (error) {
      console.error(`[WORKSPACE] Error during disconnect cleanup:`, error);
    }
  });
}
