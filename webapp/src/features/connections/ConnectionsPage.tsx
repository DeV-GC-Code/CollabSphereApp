import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchConnections,
  sendRequest,
  acceptRequest,
  rejectRequest,
  Connection,
} from '@/api/connections'
import { ConnectionCard } from './ConnectionCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'

export function ConnectionsPage() {
  const userId = useAuthStore.getState().token ? 'me' : ''
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['connections', userId],
    queryFn: async (): Promise<Connection[]> => {
      const res = await fetchConnections(userId, 1)
      return res.data
    },
  })

  const sendMut = useMutation({
    mutationFn: (id: string) => sendRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections', userId] }),
  })
  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections', userId] }),
  })
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections', userId] }),
  })

  const { register, handleSubmit, reset } = useForm<{ toUserId: string }>()
  const onSend = (data: { toUserId: string }) => {
    sendMut.mutate(data.toUserId)
    reset()
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <form onSubmit={handleSubmit(onSend)} className="flex space-x-2">
        <Input placeholder="User ID" {...register('toUserId')} />
        <Button type="submit">Connect</Button>
      </form>
      {data?.map((c) => (
        <ConnectionCard
          key={c.id}
          connection={c}
          onAccept={() => acceptMut.mutate(c.id)}
          onReject={() => rejectMut.mutate(c.id)}
        />
      ))}
      {!data?.length && <p className="text-sm text-muted-foreground">No connections.</p>}
    </div>
  )
}
