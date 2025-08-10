import { Card } from '@/components/ui/card'

export function HealthTile({ service, status }: { service: string; status: string }) {
  return (
    <Card className="p-4">
      <h2 className="font-medium">{service}</h2>
      <p>Status: {status}</p>
    </Card>
  )
}
