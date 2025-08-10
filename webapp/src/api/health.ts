import { api } from './axios'

export interface HealthResponse {
  status: string
}

export const checkHealth = (service: string) =>
  api.get<HealthResponse>(`/${service}/actuator/health`)
