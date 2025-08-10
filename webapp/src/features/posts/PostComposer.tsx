import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPost } from '@/api/posts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  content: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export function PostComposer() {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      reset()
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-2">
      <Textarea placeholder="Share something..." {...register('content')} />
      {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
      <Button type="submit" disabled={mutation.isPending}>Post</Button>
    </form>
  )
}
