import { useState } from 'react'
import { Badge, Empty, ErrorBox, Field, Modal, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const ITEM_STATUS = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

export default function FlashSales() {
  const toast = useToast()
  const { data, loading, reload } = useFetch('/seller/flash-sales')
  const { data: products } = useFetch('/seller/products', { status: 'active' })
  const [session, setSession] = useState(null)
  const [form, setForm] = useState({ product_id: '', flash_price: '', stock: 10, max_per_user: 2 })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/seller/flash-sales/${session.id}/register`, form)
      toast('Produk didaftarkan, menunggu persetujuan admin')
      setSession(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const withdraw = async (item) => {
    try {
      await api.delete(`/seller/flash-sale-items/${item.id}`)
      reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const selected = products?.data?.find((p) => p.id === Number(form.product_id))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">⚡ Flash Sale Toko</h1>
      <p className="text-sm text-gray-500">Daftarkan produk Anda ke sesi flash sale ShopIndo untuk meningkatkan penjualan.</p>
      {loading ? <Spinner /> : !data?.length ? <Empty title="Belum ada sesi flash sale mendatang" /> : data.map((s) => {
        const started = new Date(s.starts_at) <= new Date()
        return (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{dateTime(s.starts_at)} — {dateTime(s.ends_at)}</p>
              </div>
              {started ? <Badge color="bg-brand text-white">Berlangsung</Badge> : (
                <button className="btn-primary py-1" onClick={() => { setSession(s); setError('') }}>+ Daftarkan Produk</button>
              )}
            </div>
            {s.items.length > 0 && (
              <table className="table">
                <thead><tr><th>Produk</th><th>Harga Normal</th><th>Harga Flash</th><th>Stok</th><th>Terjual</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {s.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.product?.name}</td>
                      <td>{rupiah(i.product?.price)}</td>
                      <td className="text-brand">{rupiah(i.flash_price)}</td>
                      <td>{i.stock}</td>
                      <td>{i.sold}</td>
                      <td><Badge color={ITEM_STATUS[i.status]}>{i.status}</Badge></td>
                      <td>{!started && <button className="text-blue-600" onClick={() => withdraw(i)}>Tarik</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      <Modal open={!!session} onClose={() => setSession(null)} title={`Daftar ke ${session?.name || ''}`}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox message={error} />
          <Field label="Produk">
            <select className="input" required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">-- Pilih produk --</option>
              {products?.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({rupiah(p.price)}, stok {p.stock})</option>)}
            </select>
          </Field>
          <Field label={`Harga flash sale${selected ? ` (harus < ${rupiah(selected.price)})` : ''}`}>
            <input type="number" className="input" required min={100} value={form.flash_price} onChange={(e) => setForm({ ...form, flash_price: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok flash sale"><input type="number" className="input" required min={1} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
            <Field label="Maks. per pembeli"><input type="number" className="input" required min={1} value={form.max_per_user} onChange={(e) => setForm({ ...form, max_per_user: e.target.value })} /></Field>
          </div>
          <button className="btn-primary w-full">Daftarkan</button>
        </form>
      </Modal>
    </div>
  )
}
