import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PanelLayout({ title, menu, accent = 'bg-brand' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className={`${accent} sticky top-0 z-30 flex h-14 items-center justify-between px-6 text-white shadow`}>
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          🛍 ShopIndo <span className="font-normal opacity-80">| {title}</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span>👤 {user?.name}</span>
          <button onClick={() => logout().then(() => navigate('/login'))} className="rounded bg-white/20 px-3 py-1 hover:bg-white/30">
            Keluar
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r bg-white md:block">
          <nav className="py-4">
            {menu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm ${isActive ? 'border-r-4 border-brand bg-brand-light font-medium text-brand' : 'text-gray-700 hover:bg-gray-50'}`
                }
              >
                <span>{m.icon}</span>
                {m.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-6">
          <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {menu.map((m) => (
              <NavLink key={m.to} to={m.to} end={m.end} className="shrink-0 rounded bg-white px-3 py-1 text-xs">
                {m.icon} {m.label}
              </NavLink>
            ))}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
