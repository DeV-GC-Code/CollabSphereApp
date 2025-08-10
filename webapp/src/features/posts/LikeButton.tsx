import { likePost } from '@/api/posts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

export function LikeButton({ postId, likes }: { postId: string; likes: number }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => likePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  })

  return (
    <Button
      variant="ghost"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      Like ({likes})
    </Button>
  )
}
