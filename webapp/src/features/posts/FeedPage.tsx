import { useQuery } from '@tanstack/react-query'
import { listUserPosts, Post } from '@/api/posts'
import { PostComposer } from './PostComposer'
import { PostCard } from './PostCard'
import { useAuthStore } from '@/lib/auth-store'

export function FeedPage() {
  // For now, assume token encodes user; backend feed endpoint TODO
  const userId = useAuthStore.getState().token ? 'me' : ''
  const { data } = useQuery({
    queryKey: ['feed', userId],
    queryFn: async (): Promise<Post[]> => {
      const res = await listUserPosts(userId)
      return res.data
    },
  })

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <PostComposer />
      {data?.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {!data?.length && <p className="text-sm text-muted-foreground">No posts yet.</p>}
    </div>
  )
}
