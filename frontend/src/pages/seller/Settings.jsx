import { useEffect, useState } from 'react'
import LocationPicker from '../../components/LocationPicker'
import { ErrorBox, Field, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage, toFormData } from '../../lib/api'

export default function Settings() {
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [files, setFiles] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/seller/shop').then(({ data }) => setForm(data))
  }, [])

  if (!form) return <Spinner />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { name, description, phone, origin_destination_id, origin_label, address } = form
      const { data } = await api.post('/seller/shop', toFormData({ name, description: description || '', phone, origin_destination_id, origin_label, address, ...files }))
      setForm(data)
      setFiles({})
      toast('Pengaturan toko disimpan')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">⚙️ Pengaturan Toko</h1>
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Logo toko">
          {form.logo && <img src={form.logo} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setFiles({ ...files, logo: e.target.files[0] })} />
        </Field>
        <Field label="Banner toko">
          {form.banner && <img src={form.banner} alt="" className="mb-2 h-16 w-full rounded object-cover" />}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setFiles({ ...files, banner: e.target.files[0] })} />
        </Field>
      </div>
      <Field label="Nama toko"><input className="input" required minLength={3} maxLength={100} value={form.name} onChange={set('name')} /></Field>
      <Field label="Deskripsi"><textarea className="input" rows={4} maxLength={2000} value={form.description || ''} onChange={set('description')} /></Field>
      <Field label="No. HP"><input className="input" required value={form.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Lokasi asal pengiriman">
        <LocationPicker
          value={form.origin_destination_id ? { id: form.origin_destination_id, label: form.origin_label } : null}
          onChange={(loc) => setForm({ ...form, origin_destination_id: loc?.id || null, origin_label: loc?.label || '' })}
        />
      </Field>
      <Field label="Alamat lengkap"><textarea className="input" required rows={2} maxLength={500} value={form.address || ''} onChange={set('address')} /></Field>
      <button className="btn-primary">Simpan</button>
    </form>
  )
}
