import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import LocationPicker from '../../components/LocationPicker'
import { ErrorBox, Field } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api, { errorMessage } from '../../lib/api'

export default function OpenShop() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '', phone: user?.phone || '', address: '' })
  const [origin, setOrigin] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user?.shop) return <Navigate to="/seller" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!origin) return setError('Pilih lokasi asal pengiriman')
    setBusy(true)
    setError('')
    try {
      await api.post('/seller/register', { ...form, origin_destination_id: origin.id, origin_label: origin.label })
      await refreshUser()
      navigate('/seller')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">🏪 Buka Toko Gratis</h1>
      <p className="mt-1 text-sm text-gray-500">Mulai berjualan di ShopIndo. Toko akan aktif setelah diverifikasi admin.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <ErrorBox message={error} />
        <Field label="Nama toko"><input className="input" required minLength={3} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Deskripsi"><textarea className="input" rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="No. HP toko"><input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Lokasi asal pengiriman (untuk hitung ongkir)"><LocationPicker value={origin} onChange={setOrigin} /></Field>
        <Field label="Alamat lengkap toko"><textarea className="input" required rows={2} maxLength={500} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <button disabled={busy} className="btn-primary w-full py-3">Daftar Sebagai Penjual</button>
      </form>
    </div>
  )
}
