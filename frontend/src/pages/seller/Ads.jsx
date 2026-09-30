import { useState } from 'react'
import { Badge, Empty, ErrorBox, Field, Modal, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Ads() {
  const toast = useToast()
  const { data, loading, reload } = useFetch('/seller/ads')
  const { data: products } = useFetch('/seller/products', { status: 'active' })
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (form.id) await api.put(`/seller/ads/${form.id}`, form)
      else await api.post('/seller/ads', form)
      setForm(null)
      toast('Iklan disimpan')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const toggle = async (ad) => {
    await api.put(`/seller/ads/${ad.id}`, { ...ad, status: ad.status === 'active' ? 'paused' : 'active' })
    reload()
  }

  const remove = async (ad) => {
    if (!window.confirm('Hapus iklan ini?')) return
    await api.delete(`/seller/ads/${ad.id}`)
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">📢 Iklan ShopIndo</h1>
          <p className="text-sm text-gray-500">Produk tampil di posisi teratas hasil pencarian. Biaya per klik dipotong dari saldo penjual.</p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ product_id: '', keyword: '', daily_budget: 20000, cost_per_click: 500, status: 'active' })}>+ Buat Iklan</button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.length ? <Empty title="Belum ada iklan" /> : (
          <table className="table">
            <thead><tr><th>Produk</th><th>Kata Kunci</th><th>Budget Harian</th><th>CPC</th><th>Klik</th><th>Biaya Hari Ini</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.map((ad) => (
                <tr key={ad.id}>
                  <td>{ad.product?.name}</td>
                  <td>{ad.keyword || <span className="text-gray-400">Semua</span>}</td>
                  <td>{rupiah(ad.daily_budget)}</td>
                  <td>{rupiah(ad.cost_per_click)}</td>
                  <td>{ad.clicks}</td>
                  <td>{rupiah(ad.spent_today)}</td>
                  <td><Badge color={ad.status === 'active' ? 'bg-green-100 text-green-700' : undefined}>{ad.status}</Badge></td>
                  <td className="space-x-3 whitespace-nowrap text-blue-600">
                    <button onClick={() => toggle(ad)}>{ad.status === 'active' ? 'Jeda' : 'Aktifkan'}</button>
                    <button onClick={() => setForm({ ...ad, keyword: ad.keyword || '' })}>Ubah</button>
                    <button onClick={() => remove(ad)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Iklan' : 'Iklan Baru'}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBox message={error} />
            {!form.id && (
              <Field label="Produk">
                <select className="input" required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                  <option value="">-- Pilih produk --</option>
                  {products?.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Kata kunci (opsional)"><input className="input" maxLength={100} value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget harian (min. Rp5.000)"><input type="number" className="input" required min={5000} value={form.daily_budget} onChange={(e) => setForm({ ...form, daily_budget: e.target.value })} /></Field>
              <Field label="Biaya per klik (min. Rp100)"><input type="number" className="input" required min={100} value={form.cost_per_click} onChange={(e) => setForm({ ...form, cost_per_click: e.target.value })} /></Field>
            </div>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
