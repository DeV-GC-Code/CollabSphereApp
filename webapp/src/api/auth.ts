import { api } from './axios'

export interface SignUpRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
}

export const signUp = (data: SignUpRequest) =>
  api.post<AuthResponse>('/api/v1/auth/signup', data)

export const signIn = (data: { email: string; password: string }) =>
  api.post<AuthResponse>('/api/v1/auth/login', data)

// TODO: current user lookup once backend provides /api/v1/auth/me
export const getCurrentUser = async () => {
  throw new Error('TODO: implement GET /api/v1/auth/me')
}
