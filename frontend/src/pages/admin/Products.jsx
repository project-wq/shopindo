import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Empty, Pagination, Spinner, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Products() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/admin/products', { status: status || undefined, q: q || undefined, page })

  const ban = async (p) => {
    const reason = window.prompt('Alasan pemblokiran (mis. produk terlarang / palsu):')
    if (!reason) return
    try {
      await api.post(`/admin/products/${p.id}/ban`, { reason })
      toast('Produk diblokir')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  const unban = async (p) => {
    await api.post(`/admin/products/${p.id}/unban`)
    reload()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Moderasi Produk</h1>
      <Tabs tabs={[{ value: '', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Diarsipkan' }, { value: 'banned', label: 'Diblokir' }]} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      <input className="input max-w-sm" placeholder="Cari produk" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Produk</th><th>Toko</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
                      <Link to={`/product/${p.slug}`} className="line-clamp-2 max-w-xs text-blue-600">{p.name}</Link>
                    </div>
                    {p.ban_reason && <p className="text-xs text-red-600">{p.ban_reason}</p>}
                  </td>
                  <td>{p.shop?.name}</td>
                  <td>{p.category?.name}</td>
                  <td>{rupiah(p.price)}</td>
                  <td>{p.stock}</td>
                  <td><Badge color={p.status === 'banned' ? 'bg-red-100 text-red-700' : p.status === 'active' ? 'bg-green-100 text-green-700' : undefined}>{p.status}</Badge></td>
                  <td>{p.status === 'banned' ? <button className="text-blue-600" onClick={() => unban(p)}>Buka blokir</button> : <button className="text-red-600" onClick={() => ban(p)}>Blokir</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} onPage={setPage} />
    </div>
  )
}
