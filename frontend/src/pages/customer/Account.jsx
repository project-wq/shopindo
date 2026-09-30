import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LocationPicker from '../../components/LocationPicker'
import { ErrorBox, Field, Modal, Spinner, Tabs } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage, toFormData } from '../../lib/api'
import useFetch from '../../lib/useFetch'

export default function Account() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'profile'
  return (
    <div className="space-y-3">
      <Tabs
        tabs={[
          { value: 'profile', label: 'Profil' },
          { value: 'address', label: 'Alamat' },
          { value: 'password', label: 'Ubah Password' },
        ]}
        value={tab}
        onChange={(v) => setParams({ tab: v })}
      />
      <div className="card p-6">{tab === 'address' ? <Addresses /> : tab === 'password' ? <PasswordForm /> : <Profile />}</div>
    </div>
  )
}

function Profile() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' })
  const [avatar, setAvatar] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/auth/profile', toFormData({ ...form, phone: form.phone || null, avatar }))
      await refreshUser()
      toast('Profil diperbarui')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <h2 className="text-lg">Profil Saya</h2>
      <ErrorBox message={error} />
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl">
          {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : '👤'}
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAvatar(e.target.files[0])} className="text-sm" />
      </div>
      <Field label="Email"><input className="input bg-gray-50" value={user.email} disabled /></Field>
      <Field label="Nama"><input className="input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="No. HP"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <button className="btn-primary">Simpan</button>
    </form>
  )
}

function PasswordForm() {
  const toast = useToast()
  const empty = { current_password: '', password: '', password_confirmation: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.put('/auth/password', form)
      setForm(empty)
      toast('Password berhasil diubah')
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <h2 className="text-lg">Ubah Password</h2>
      <ErrorBox message={error} />
      {[['current_password', 'Password saat ini'], ['password', 'Password baru'], ['password_confirmation', 'Konfirmasi password baru']].map(([k, l]) => (
        <Field key={k} label={l}>
          <input type="password" className="input" required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </Field>
      ))}
      <button className="btn-primary">Simpan</button>
    </form>
  )
}

const emptyAddress = { label: 'Rumah', recipient_name: '', phone: '', destination_id: null, destination_label: '', postal_code: '', address_line: '', is_default: false }

function Addresses() {
  const toast = useToast()
  const { data, loading, reload } = useFetch('/addresses')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    if (!editing.destination_id) return setError('Pilih kecamatan/kota tujuan')
    setError('')
    try {
      if (editing.id) await api.put(`/addresses/${editing.id}`, editing)
      else await api.post('/addresses', editing)
      setEditing(null)
      reload()
      toast('Alamat disimpan')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Hapus alamat ini?')) return
    await api.delete(`/addresses/${id}`)
    reload()
  }

  if (loading) return <Spinner />
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg">Alamat Saya</h2>
        <button className="btn-primary" onClick={() => setEditing({ ...emptyAddress })}>+ Tambah Alamat</button>
      </div>
      <div className="divide-y">
        {data?.map((a) => (
          <div key={a.id} className="flex justify-between gap-4 py-4 text-sm">
            <div>
              <p><b>{a.recipient_name}</b> | {a.phone} <span className="text-gray-400">({a.label})</span></p>
              <p className="text-gray-600">{a.address_line}</p>
              <p className="text-gray-600">{a.destination_label} {a.postal_code}</p>
              {a.is_default && <span className="mt-1 inline-block border border-brand px-1 text-xs text-brand">Utama</span>}
            </div>
            <div className="flex shrink-0 gap-3 text-blue-600">
              <button onClick={() => setEditing({ ...a })}>Ubah</button>
              <button onClick={() => remove(a.id)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Ubah Alamat' : 'Alamat Baru'}>
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBox message={error} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama penerima"><input className="input" required value={editing.recipient_name} onChange={(e) => setEditing({ ...editing, recipient_name: e.target.value })} /></Field>
              <Field label="No. HP"><input className="input" required value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            </div>
            <Field label="Kecamatan / Kota">
              <LocationPicker
                value={editing.destination_id ? { id: editing.destination_id, label: editing.destination_label } : null}
                onChange={(loc) =>
                  setEditing({ ...editing, destination_id: loc?.id || null, destination_label: loc?.label || '', postal_code: loc?.postal_code || editing.postal_code })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kode pos"><input className="input" value={editing.postal_code || ''} onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })} /></Field>
              <Field label="Label"><input className="input" required value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
            </div>
            <Field label="Detail alamat (jalan, no. rumah, RT/RW)">
              <textarea className="input" required rows={2} value={editing.address_line} onChange={(e) => setEditing({ ...editing, address_line: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> Jadikan alamat utama
            </label>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
