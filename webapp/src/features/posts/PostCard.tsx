import DOMPurify from 'dompurify'
import { Post } from '@/api/posts'
import { LikeButton } from './LikeButton'
import { Card } from '@/components/ui/card'

export function PostCard({ post }: { post: Post }) {
  return (
    <Card className="p-4 space-y-2">
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
      <LikeButton postId={post.id} likes={post.likes} />
    </Card>
  )
}
