import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from '@/api/auth'
import { useAuthStore } from '@/lib/auth-store'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const res = await signIn(data)
    setToken(res.data.token)
    navigate('/feed')
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-xl mb-4">Sign In</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        <Input placeholder="Password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
      <p className="mt-4 text-sm">
        No account? <Link to="/auth/signup" className="text-primary">Sign up</Link>
      </p>
    </div>
  )
}
