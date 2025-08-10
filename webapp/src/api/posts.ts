import { api } from './axios'

export interface Post {
  id: string
  userId: string
  content: string
  likes: number
}

export const createPost = (data: { content: string }) =>
  api.post<Post>('/api/v1/posts/core', data)

export const fetchPost = (id: string) =>
  api.get<Post>(`/api/v1/posts/core/${id}`)

export const listUserPosts = (userId: string) =>
  api.get<Post[]>(`/api/v1/posts/core`, { params: { userId } })

export const likePost = (postId: string) =>
  api.post(`/api/v1/posts/likes/${postId}`)

// TODO: implement generic feed & pagination when backend available
