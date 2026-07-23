export interface JwtPayload {
  sub: string
  email: string
  name: string
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  passwordConfirmation?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export type RefreshResponse = AuthResponse
