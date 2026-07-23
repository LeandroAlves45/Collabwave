// Tipos de autenticacao e payloads JWT.
export interface User {
  id: string; // UUID
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: Date;
}

// User sem dados sensiveis, seguro para resposta HTTP.
export type SafeUser = Omit<User, 'password_hash'>;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface JwtAccessPayload {
  sub: string; // Subject JWT: ID do utilizador.
  email: string;
  name: string;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string; // ID unico do token, usado para revogacao.
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
}

// O refresh token só atravessa a fronteira HTTP através de um cookie HttpOnly.
export interface AuthSession extends AuthResponse {
  refreshToken: string;
}
