import { useState } from 'react'
import { Badge, Empty, ErrorBox, Field, Modal, Pagination, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah, toLocalInput } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const ITEM_STATUS = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

export default function FlashSales() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/admin/flash-sales', { page })
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (form.id) await api.put(`/admin/flash-sales/${form.id}`, form)
      else await api.post('/admin/flash-sales', form)
      setForm(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const openDetail = async (fs) => setDetail((await api.get(`/admin/flash-sales/${fs.id}`)).data)

  const review = async (item, status) => {
    try {
      await api.patch(`/admin/flash-sale-items/${item.id}`, { status })
      openDetail(detail)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const remove = async (fs) => {
    if (!window.confirm(`Hapus ${fs.name}?`)) return
    try {
      await api.delete(`/admin/flash-sales/${fs.id}`)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">⚡ Sesi Flash Sale</h1>
        <button className="btn-primary" onClick={() => setForm({ name: '', starts_at: '', ends_at: '', is_active: true })}>+ Sesi Baru</button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Nama</th><th>Mulai</th><th>Selesai</th><th>Produk</th><th>Menunggu Review</th><th>Aktif</th><th></th></tr></thead>
            <tbody>
              {data.data.map((fs) => (
                <tr key={fs.id}>
                  <td>{fs.name}</td>
                  <td>{dateTime(fs.starts_at)}</td>
                  <td>{dateTime(fs.ends_at)}</td>
                  <td>{fs.items_count}</td>
                  <td>{fs.pending_count > 0 ? <Badge color="bg-yellow-100 text-yellow-700">{fs.pending_count}</Badge> : 0}</td>
                  <td>{fs.is_active ? '✓' : '✕'}</td>
                  <td className="space-x-3 whitespace-nowrap text-blue-600">
                    <button onClick={() => openDetail(fs)}>Produk</button>
                    <button onClick={() => setForm({ ...fs, starts_at: toLocalInput(fs.starts_at), ends_at: toLocalInput(fs.ends_at) })}>Ubah</button>
                    <button onClick={() => remove(fs)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Sesi' : 'Sesi Flash Sale Baru'}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBox message={error} />
            <Field label="Nama sesi"><input className="input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Mulai"><input type="datetime-local" className="input" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
            <Field label="Selesai"><input type="datetime-local" className="input" required value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif</label>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Produk ${detail?.name || ''}`} wide>
        {detail && (!detail.items?.length ? <Empty title="Belum ada produk didaftarkan" /> : (
          <table className="table">
            <thead><tr><th>Produk</th><th>Toko</th><th>Normal</th><th>Flash</th><th>Stok</th><th>Terjual</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {detail.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.product?.name}</td>
                  <td>{i.product?.shop?.name}</td>
                  <td>{rupiah(i.product?.price)}</td>
                  <td className="text-brand">{rupiah(i.flash_price)}</td>
                  <td>{i.stock}</td>
                  <td>{i.sold}</td>
                  <td><Badge color={ITEM_STATUS[i.status]}>{i.status}</Badge></td>
                  <td className="space-x-2 whitespace-nowrap">
                    {i.status !== 'approved' && <button className="text-green-600" onClick={() => review(i, 'approved')}>Setujui</button>}
                    {i.status !== 'rejected' && <button className="text-red-600" onClick={() => review(i, 'rejected')}>Tolak</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </Modal>
    </div>
  )
}
