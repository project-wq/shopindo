import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ErrorBox } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'

export function AuthShell({ title, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
          <Link to="/" className="text-2xl font-bold text-brand">🛍 ShopIndo</Link>
          <span className="text-xl">{title}</span>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center bg-brand px-4 py-12">
        <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
          <div className="hidden text-center text-white md:block">
            <p className="text-8xl">🛍️</p>
            <p className="mt-4 text-3xl font-bold">ShopIndo</p>
            <p className="mt-2 text-lg">Platform e-commerce multi-vendor pilihan Indonesia</p>
          </div>
          <div className="mx-auto w-full max-w-sm rounded bg-white p-8 shadow-lg">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await login(form.email, form.password)
      const home = user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/'
      navigate(location.state?.from || home, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Log In">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-xl">Log In</h1>
        <ErrorBox message={error} />
        <input className="input py-3" type="email" required autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input py-3" type="password" required autoComplete="current-password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Memproses...' : 'LOG IN'}</button>
        <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">
          <p className="font-semibold">Akun demo (password: password123)</p>
          <p>customer@shopindo.test · seller@shopindo.test · admin@shopindo.test</p>
        </div>
        <p className="text-center text-sm text-gray-500">
          Baru di ShopIndo? <Link to="/register" className="text-brand">Daftar</Link>
        </p>
      </form>
    </AuthShell>
  )
}
