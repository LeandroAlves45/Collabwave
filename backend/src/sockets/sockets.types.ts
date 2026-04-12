// ============================================================
// CollabWave — Socket.io Type Definitions
// ============================================================
// O Socket.io v4 suporta tipagem genérica completa.
// Definimos aqui os tipos dos eventos e dos dados do socket
// para ter type safety em toda a camada WebSocket.
//
// ESTRUTURA DOS GENÉRICOS DO SOCKET.IO:
// Server<ClientToServer, ServerToClient, ServerToServer, SocketData>
//   - ClientToServer:  eventos que o cliente envia ao servidor
//   - ServerToClient:  eventos que o servidor envia ao cliente
//   - ServerToServer:  eventos entre servidores (via Redis adapter)
//   - SocketData:      dados armazenados em socket.data (tipo seguro)
// ============================================================

import { Server, Socket } from 'socket.io';
import { string } from 'zod';

// -----------------------------------------------------------
// Tipos de dados partilhados
// -----------------------------------------------------------

// Representa o utilizador autenticado, extráido do token JWT
// e armazena em socket.data após validação 
export interface AuthenticatedUser {
    id: string; // UUID do utilizador
    email: string; // Email do utilizador
    name: string; // Nome do utilizador
}

// -----------------------------------------------------------
// Eventos: Cliente -> Servidor
// -----------------------------------------------------------
// Define o contrato dos eventos que o cliente pode emitir

export interface ClientToServerEvents {
  // Pede para entrar na room de um workspace
  'workspace:join': (payload: { workspaceId: string }) => void;

  // Pede para sair da room de um workspace
  'workspace:leave': (payload: { workspaceId: string }) => void;

  // Envia posição do cursor (throttled pelo cliente)
  'cursor:move': (payload: { workspaceId: string; x: number; y: number }) => void;
}

// -----------------------------------------------------------
// Eventos: Servidor -> Cliente
// ------------------------------------------------------------
// Define os eventos que o servidor pode emitir para os clientes

export interface ServerToClientEvents {
  // Atualização da lista de utilizadores online num workspace
  'workspace:presence_update': (payload: { onlineUsers: AuthenticatedUser[] }) => void;

  // Notificação de erro (ex: autenticação falhou)
  'error': (payload: { code: string, message: string }) => void;

  // Atualização das posições dos cursores (broadcast throttled)
  'cursor:positions': (payload: { cursors: Array<{ userId: string; x: number; y: number }> }) => void;
}

// -----------------------------------------------------------
// Dados do Socket (socket.data)
// -----------------------------------------------------------
// Tipagem do objeto socket.data. Dados associados a cada socket

export interface SocketData {
  user: AuthenticatedUser; // Dados do utilizador autenticado
}

// -----------------------------------------------------------
// Tipos derivados para uso nos handlers
// ------------------------------------------------------------
// Aliases tipados para Socket e Server com os nossos genéricos
// Usar estes tipos de handlers garante type safety completo

export type CollabWaveSocket = Socket
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,  // Sem eventos server-to-server explicítos
  SocketData
>;

export type CollabWaveServer = Server
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,  // Sem eventos server-to-server explicítos
  SocketData
>;