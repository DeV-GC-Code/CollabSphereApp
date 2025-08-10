import { api } from './axios'

export interface Connection {
  id: string
  fromUserId: string
  toUserId: string
  status: string
}

export const sendRequest = (toUserId: string) =>
  api.post(`/api/v1/connections/core/request/${toUserId}`)

export const acceptRequest = (requestId: string) =>
  api.post(`/api/v1/connections/core/accept/${requestId}`)

export const rejectRequest = (requestId: string) =>
  api.post(`/api/v1/connections/core/reject/${requestId}`)

export const fetchConnections = (userId: string, degree: number) =>
  api.get<Connection[]>(`/api/v1/connections/core/${userId}`, { params: { degree } })

// TODO: suggested connections & pending requests endpoints
export const suggestedConnections = async () => {
  // TODO implement endpoint
  return [] as Connection[]
}
