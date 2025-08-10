import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { FeedPage } from '@/features/posts/FeedPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ConnectionsPage } from '@/features/connections/ConnectionsPage'
import { HealthPage } from '@/features/admin/HealthPage'
import { AppShell } from '@/components/AppShell'
import { features } from '@/lib/feature-flags'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { CommunitiesPage } from '@/features/communities/CommunitiesPage'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/lib/auth-store'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.token)
  if (!token) {
    return <Navigate to="/auth/login" replace />
  }
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Navigate to="/feed" />} />
            <Route path="feed" element={<FeedPage />} />
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="admin/health" element={<HealthPage />} />
            {features.notifications && (
              <Route path="notifications" element={<NotificationsPage />} />
            )}
            {features.communities && (
              <Route path="communities" element={<CommunitiesPage />} />
            )}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
