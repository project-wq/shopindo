import { useState } from 'react'
import { ErrorBox, Field, Modal, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import useFetch from '../../lib/useFetch'

export default function Categories() {
  const toast = useToast()
  const { data, loading, reload } = useFetch('/admin/categories')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    const payload = { ...form, parent_id: form.parent_id || null }
    try {
      if (form.id) await api.put(`/admin/categories/${form.id}`, payload)
      else await api.post('/admin/categories', payload)
      setForm(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Hapus kategori ${c.name}?`)) return
    try {
      await api.delete(`/admin/categories/${c.id}`)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (loading) return <Spinner />
  const parents = data.filter((c) => !c.parent_id)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kategori</h1>
        <button className="btn-primary" onClick={() => setForm({ name: '', icon: '', parent_id: '', sort_order: 0, is_active: true })}>+ Kategori</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Ikon</th><th>Nama</th><th>Induk</th><th>Produk</th><th>Urutan</th><th>Aktif</th><th></th></tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td className="text-2xl">{c.icon}</td>
                <td>{c.parent_id ? '— ' : ''}{c.name}</td>
                <td>{data.find((p) => p.id === c.parent_id)?.name || '-'}</td>
                <td>{c.products_count}</td>
                <td>{c.sort_order}</td>
                <td>{c.is_active ? '✓' : '✕'}</td>
                <td className="space-x-3 text-blue-600">
                  <button onClick={() => setForm({ ...c, icon: c.icon || '', parent_id: c.parent_id || '' })}>Ubah</button>
                  <button onClick={() => remove(c)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Kategori' : 'Kategori Baru'}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBox message={error} />
            <Field label="Nama"><input className="input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Ikon (emoji)"><input className="input" maxLength={10} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
            <Field label="Induk">
              <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                <option value="">(Kategori utama)</option>
                {parents.filter((p) => p.id !== form.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Urutan"><input type="number" min={0} className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif</label>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
