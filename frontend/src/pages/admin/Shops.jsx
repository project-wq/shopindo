import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Empty, Pagination, Spinner, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateOnly, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const COLOR = { active: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', suspended: 'bg-red-100 text-red-700' }

export default function Shops() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/admin/shops', { status: status || undefined, q: q || undefined, page })

  const update = async (shop, patch) => {
    try {
      await api.patch(`/admin/shops/${shop.id}/status`, { status: shop.status === 'pending' ? 'active' : shop.status, ...patch })
      toast('Toko diperbarui')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Toko & Seller</h1>
      <Tabs
        tabs={[{ value: '', label: 'Semua' }, { value: 'pending', label: 'Menunggu Verifikasi' }, { value: 'active', label: 'Aktif' }, { value: 'suspended', label: 'Ditangguhkan' }]}
        value={status}
        onChange={(v) => { setParams(v ? { status: v } : {}); setPage(1) }}
      />
      <input className="input max-w-sm" placeholder="Cari nama toko" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Toko</th><th>Pemilik</th><th>Lokasi</th><th>Produk</th><th>Saldo</th><th>Bergabung</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.data.map((s) => (
                <tr key={s.id}>
                  <td>{s.name} {s.is_official && <Badge color="bg-brand text-white">Mall</Badge>}</td>
                  <td>{s.owner?.name}<p className="text-xs text-gray-500">{s.owner?.email}</p></td>
                  <td className="text-xs">{s.origin_label}</td>
                  <td>{s.products_count}</td>
                  <td>{rupiah(s.balance)}</td>
                  <td>{dateOnly(s.created_at)}</td>
                  <td><Badge color={COLOR[s.status]}>{s.status}</Badge></td>
                  <td className="space-y-1 whitespace-nowrap text-blue-600">
                    {s.status !== 'active' && <button className="block" onClick={() => update(s, { status: 'active' })}>✓ Aktifkan</button>}
                    {s.status === 'active' && <button className="block text-red-600" onClick={() => update(s, { status: 'suspended' })}>Tangguhkan</button>}
                    <button className="block" onClick={() => update(s, { is_official: !s.is_official })}>{s.is_official ? 'Cabut Mall' : 'Jadikan Mall'}</button>
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
