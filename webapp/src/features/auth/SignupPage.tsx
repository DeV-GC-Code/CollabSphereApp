import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUp } from '@/api/auth'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function SignupPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await signUp(data)
    navigate('/auth/login')
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-xl mb-4">Sign Up</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Input placeholder="Username" {...register('username')} />
        {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        <Input placeholder="Password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        <Button type="submit" className="w-full">Create Account</Button>
      </form>
      <p className="mt-4 text-sm">
        Have an account? <Link to="/auth/login" className="text-primary">Sign in</Link>
      </p>
    </div>
  )
}
