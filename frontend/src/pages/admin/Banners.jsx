import { useState } from 'react'
import { ErrorBox, Field, Modal, Spinner } from '../../components/ui'
import api, { errorMessage, toFormData } from '../../lib/api'
import useFetch from '../../lib/useFetch'

export default function Banners() {
  const { data, loading, reload } = useFetch('/admin/banners')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    const { id, title, link, sort_order, is_active, image_url, file } = form
    try {
      const payload = toFormData({ title, link: link || null, sort_order, is_active, image_url: image_url || null, image: file })
      await api.post(id ? `/admin/banners/${id}` : '/admin/banners', payload)
      setForm(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const remove = async (b) => {
    if (!window.confirm('Hapus banner?')) return
    await api.delete(`/admin/banners/${b.id}`)
    reload()
  }

  if (loading) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Banner Beranda</h1>
        <button className="btn-primary" onClick={() => setForm({ title: '', link: '/search', sort_order: data.length, is_active: true, image_url: '' })}>+ Banner</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((b) => (
          <div key={b.id} className="card overflow-hidden">
            <img src={b.image} alt={b.title} className="aspect-[3/1] w-full object-cover" />
            <div className="flex items-center justify-between p-3 text-sm">
              <div>
                <p className="font-medium">{b.title} {!b.is_active && <span className="text-xs text-gray-400">(nonaktif)</span>}</p>
                <p className="text-xs text-gray-500">{b.link} · urutan {b.sort_order}</p>
              </div>
              <div className="space-x-3 text-blue-600">
                <button onClick={() => setForm({ ...b, image_url: '' })}>Ubah</button>
                <button onClick={() => remove(b)}>Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Banner' : 'Banner Baru'}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBox message={error} />
            <Field label="Judul"><input className="input" required maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Gambar (upload, rasio 3:1)"><input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></Field>
            <Field label="atau URL gambar (https)"><input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
            <Field label="Link tujuan (/path atau https://)"><input className="input" value={form.link || ''} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
            <Field label="Urutan"><input type="number" min={0} className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif</label>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
