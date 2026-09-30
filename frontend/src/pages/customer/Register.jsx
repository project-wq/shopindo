import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorBox } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'
import { AuthShell } from './Login'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ ...form, phone: form.phone || null })
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Daftar">
      <form onSubmit={submit} className="space-y-3">
        <h1 className="text-xl">Daftar</h1>
        <ErrorBox message={error} />
        <input className="input py-3" required maxLength={100} placeholder="Nama lengkap" value={form.name} onChange={set('name')} />
        <input className="input py-3" type="email" required placeholder="Email" value={form.email} onChange={set('email')} />
        <input className="input py-3" placeholder="No. HP (08xxxxxxxxxx)" value={form.phone} onChange={set('phone')} />
        <input className="input py-3" type="password" required minLength={8} autoComplete="new-password" placeholder="Password (min. 8 karakter)" value={form.password} onChange={set('password')} />
        <input className="input py-3" type="password" required autoComplete="new-password" placeholder="Konfirmasi password" value={form.password_confirmation} onChange={set('password_confirmation')} />
        <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Memproses...' : 'DAFTAR'}</button>
        <p className="text-center text-sm text-gray-500">
          Sudah punya akun? <Link to="/login" className="text-brand">Log In</Link>
        </p>
      </form>
    </AuthShell>
  )
}
