import { Link, Outlet } from 'react-router-dom'
import { features } from '@/lib/feature-flags'

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="container mx-auto flex items-center gap-4 p-4">
          <Link to="/feed" className="font-bold">CollabSphere</Link>
          <Link to="/connections">Connections</Link>
          <Link to="/admin/health">Health</Link>
          {features.notifications && <Link to="/notifications">Notifications</Link>}
          {features.communities && <Link to="/communities">Communities</Link>}
        </nav>
      </header>
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
