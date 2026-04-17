// Página de login e registo de usuário
// Interface para o payload do JWT access token

//  Payload contido dentro do JWT access token após decode
// O backend assina tokens com: { sub, email, name, iat, exp }
export interface JwtPayload {
  sub: string // ID do usuário
  email: string // Email do usuário
  name: string // Nome do usuário
  iat: number // Timestamp de emissão
  exp: number // Timestamp de expiração
}

// Objeto do utilizador autenticado guardado no authStore
// Separado do JwtPayload para permitir adicionar campos adicionais
export interface AuthUser {
  id: string // ID do usuário (sub do JWT)
  name: string // Nome do usuário
  email: string // Email do usuário
  avatarUrl?: string // URL do avatar do usuário
}

// Payload enviado para o POST /api/auth/register
export interface RegisterPayload {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

// Payload enviado para o POST /api/auth/login
export interface LoginPayload {
  email: string
  password: string
}

// Resposta de POST /api/auth/login e POST /api/auth/register
export interface AuthResponse {
  accessToken: string // JWT access token
  refreshToken: string // JWT refresh token (para renovar sessão)
  user: AuthUser // Dados do usuário autenticado
}

// Resposta de POST /api/auth/refresh
export interface RefreshResponse {
  accessToken: string // Novo JWT access token
}
