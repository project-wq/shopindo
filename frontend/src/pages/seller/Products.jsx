import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Empty, Pagination, Spinner, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const STATUS_COLOR = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', banned: 'bg-red-100 text-red-700' }

export default function Products() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/seller/products', { status: status || undefined, q: q || undefined, page })

  const remove = async (p) => {
    if (!window.confirm(`Hapus produk "${p.name}"?`)) return
    try {
      await api.delete(`/seller/products/${p.id}`)
      toast('Produk dihapus')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk Saya</h1>
        <Link to="/seller/products/new" className="btn-primary">+ Tambah Produk</Link>
      </div>
      <Tabs
        tabs={[{ value: '', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Diarsipkan' }, { value: 'banned', label: 'Pelanggaran' }]}
        value={status}
        onChange={(v) => { setStatus(v); setPage(1) }}
      />
      <input className="input max-w-sm" placeholder="Cari nama produk" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty title="Belum ada produk" /> : (
          <table className="table">
            <thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Terjual</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
                      <div>
                        <p className="line-clamp-2 max-w-xs">{p.name}</p>
                        {p.variants?.length > 0 && <p className="text-xs text-gray-500">{p.variants.length} variasi</p>}
                        {p.ban_reason && <p className="text-xs text-red-600">{p.ban_reason}</p>}
                      </div>
                    </div>
                  </td>
                  <td>{p.min_price !== p.max_price ? `${rupiah(p.min_price)} - ${rupiah(p.max_price)}` : rupiah(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.sold_count}</td>
                  <td><Badge color={STATUS_COLOR[p.status]}>{p.status}</Badge></td>
                  <td className="space-x-3 whitespace-nowrap text-blue-600">
                    {p.status !== 'banned' && <Link to={`/seller/products/${p.id}`}>Ubah</Link>}
                    <button onClick={() => remove(p)}>Hapus</button>
                  </td>
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
