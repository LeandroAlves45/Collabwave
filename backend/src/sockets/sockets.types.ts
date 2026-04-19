// Contratos tipados dos eventos Socket.io e de socket.data.

import { Server, Socket } from 'socket.io';
import type { Task, TaskWithUsers } from '../modules/tasks/task.types.js';

export interface AuthenticatedUser {
  id: string; // UUID do utilizador
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
}

export interface ClientToServerEvents {
  'workspace:join': (payload: { workspaceId: string }) => void;
  'workspace:leave': (payload: { workspaceId: string }) => void;

  'cursor:move': (payload: {
    workspaceId: string;
    x: number;
    y: number;
  }) => void;

  'task:create': (payload: {
    workspaceId: string;
    columnId: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
  }) => void;

  'task:update': (payload: {
    taskId: string;
    fields: Partial<
      Pick<
        Task,
        'title' | 'description' | 'priority' | 'due_date' | 'assignee_id'
      >
    >;
  }) => void;

  'task:move': (payload: {
    taskId: string;
    targetColumnId: string;
    newPosition: number;
  }) => void;

  'task:delete': (payload: { taskId: string }) => void;
}

export interface ServerToClientEvents {
  'workspace:presence_update': (payload: {
    onlineUsers: AuthenticatedUser[];
  }) => void;

  error: (payload: { code: string; message: string }) => void;

  'cursor:positions': (payload: {
    cursors: Array<{ userId: string; x: number; y: number }>;
  }) => void;

  'task:created': (payload: { task: Task | TaskWithUsers }) => void;
  'task:updated': (payload: { task: Task | TaskWithUsers }) => void;

  'task:moved': (payload: {
    taskId: string;
    targetColumnId: string;
    newPosition: number;
    movedBy: string;
  }) => void;

  'task:deleted': (payload: { taskId: string; deletedBy: string }) => void;
}

export interface SocketData {
  user: AuthenticatedUser;
}

export type CollabWaveSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type CollabWaveServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
