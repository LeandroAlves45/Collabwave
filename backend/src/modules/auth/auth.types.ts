// ============================================================
// CollabWave - Auth Types
// ============================================================
// Interfaces e tipos TypeScript usados pelo módulo de autenticação.
// Centralizar os tipos evita duplicação e garante consistência.
// ============================================================

// ------------------------------------------------------------
// Entidade User
// ------------------------------------------------------------
// Representa um registo completo da tabela "users" na base de dados.
export interface User {
  id: string; // UUID
  name: string;
  email: string;
  password_hash: string; // Hash da password
  avatar_url: string | null; // URL do avatar, pode ser null
  created_at: Date;
}

// Versão do User sem dados sensíveis - segura para enviar ao cliente
export type SafeUser = Omit<User, 'password_hash'>;

// ------------------------------------------------------------
// Payloads dos Endpoints
// ------------------------------------------------------------

// Dados recebidos no corpo do pedido de registo
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// Dados recebidos no corpo do pedido de login
export interface LoginPayload {
  email: string;
  password: string;
}

// ---------------------------------------------
// JWT
// ----------------------------------------------

// Payload que é assinado dentro do acess token JWT
export interface JwtAccessPayload {
  sub: string; // ID do utilizador, "subject" - convenção JWT para o ID do utilizador
  email: string;
}

// Payload que é assinado dentro do refresh token JWT
export interface JwtRefreshPayload {
  sub: string; // ID do utilizador
  jti: string; // JWT ID - um identificador único para este token, usado para revogação
}

// Reposta padrão com tokens de autenticação
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Resposta completa de login/registo - tokens + dados do utilizador
export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}
