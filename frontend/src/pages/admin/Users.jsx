import { useState } from 'react'
import { Badge, Empty, Pagination, Spinner, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Users() {
  const toast = useToast()
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/admin/users', { role: role || undefined, q: q || undefined, page })

  const toggle = async (u) => {
    if (!window.confirm(`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.email}?`)) return
    try {
      await api.post(`/admin/users/${u.id}/toggle-active`)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pengguna</h1>
      <Tabs tabs={[{ value: '', label: 'Semua' }, { value: 'customer', label: 'Pembeli' }, { value: 'seller', label: 'Seller' }, { value: 'admin', label: 'Admin' }]} value={role} onChange={(v) => { setRole(v); setPage(1) }} />
      <input className="input max-w-sm" placeholder="Cari nama / email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Nama</th><th>Email</th><th>HP</th><th>Role</th><th>Toko</th><th>Login Terakhir</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td><Badge>{u.role}</Badge></td>
                  <td>{u.shop?.name || '-'}</td>
                  <td className="text-xs">{dateTime(u.last_login_at)}</td>
                  <td>{u.is_active ? <Badge color="bg-green-100 text-green-700">Aktif</Badge> : <Badge color="bg-red-100 text-red-700">Nonaktif</Badge>}</td>
                  <td><button className="text-blue-600" onClick={() => toggle(u)}>{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
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
