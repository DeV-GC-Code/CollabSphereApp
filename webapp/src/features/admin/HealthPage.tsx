import { useQuery } from '@tanstack/react-query'
import { checkHealth, HealthResponse } from '@/api/health'
import { HealthTile } from '@/components/HealthTile'

const services = ['user-service', 'posts-service', 'connections-service']

function ServiceHealth({ service }: { service: string }) {
  const { data } = useQuery({
    queryKey: ['health', service],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await checkHealth(service)
      return res.data
    },
    refetchInterval: 30000,
  })

  return <HealthTile service={service} status={data?.status ?? 'unknown'} />
}

export function HealthPage() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3">
      {services.map((s) => (
        <ServiceHealth key={s} service={s} />
      ))}
    </div>
  )
}
