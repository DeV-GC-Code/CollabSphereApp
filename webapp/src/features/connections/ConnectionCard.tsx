import { Connection } from '@/api/connections'
import { Button } from '@/components/ui/button'

interface Props {
  connection: Connection
  onAccept?: () => void
  onReject?: () => void
}

export function ConnectionCard({ connection, onAccept, onReject }: Props) {
  return (
    <div className="border rounded p-2 flex items-center justify-between">
      <span>{connection.toUserId}</span>
      {connection.status === 'PENDING' && (
        <div className="space-x-2">
          <Button size="sm" onClick={onAccept}>Accept</Button>
          <Button size="sm" variant="destructive" onClick={onReject}>Reject</Button>
        </div>
      )}
    </div>
  )
}
