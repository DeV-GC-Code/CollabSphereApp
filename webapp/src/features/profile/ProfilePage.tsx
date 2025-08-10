import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listUserPosts, Post } from '@/api/posts'
import { fetchConnections, Connection } from '@/api/connections'
import { PostCard } from '../posts/PostCard'
import { ConnectionCard } from '../connections/ConnectionCard'

export function ProfilePage() {
  const { userId = '' } = useParams<{ userId: string }>()
  const posts = useQuery({
    queryKey: ['profilePosts', userId],
    queryFn: async (): Promise<Post[]> => {
      const res = await listUserPosts(userId)
      return res.data
    },
  })
  const connections = useQuery({
    queryKey: ['profileConnections', userId],
    queryFn: async (): Promise<Connection[]> => {
      const res = await fetchConnections(userId, 1)
      return res.data
    },
  })

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl">Profile {userId}</h1>
      <section>
        <h2 className="text-lg mb-2">Connections</h2>
        {connections.data?.map((c) => (
          <ConnectionCard key={c.id} connection={c} />
        ))}
        {!connections.data?.length && <p className="text-sm text-muted-foreground">No connections.</p>}
      </section>
      <section>
        <h2 className="text-lg mb-2">Posts</h2>
        {posts.data?.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {!posts.data?.length && <p className="text-sm text-muted-foreground">No posts.</p>}
      </section>
    </div>
  )
}
