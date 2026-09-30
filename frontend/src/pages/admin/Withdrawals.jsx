import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Empty, Pagination, Spinner, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const COLOR = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

export default function Withdrawals() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/admin/withdrawals', { status: status || undefined, page })

  const process = async (w, decision) => {
    const note = decision === 'rejected' ? window.prompt('Alasan penolakan:') : window.prompt('Catatan (mis. no. referensi transfer):', '')
    if (note === null) return
    try {
      await api.patch(`/admin/withdrawals/${w.id}`, { status: decision, admin_note: note || null })
      toast('Penarikan diproses')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Penarikan Dana Seller</h1>
      <Tabs tabs={[{ value: '', label: 'Semua' }, { value: 'pending', label: 'Menunggu' }, { value: 'approved', label: 'Disetujui' }, { value: 'rejected', label: 'Ditolak' }]} value={status} onChange={(v) => { setParams(v ? { status: v } : {}); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Tanggal</th><th>Toko</th><th>Jumlah</th><th>Rekening</th><th>Status</th><th>Catatan</th><th></th></tr></thead>
            <tbody>
              {data.data.map((w) => (
                <tr key={w.id}>
                  <td className="text-xs">{dateTime(w.created_at)}</td>
                  <td>{w.shop?.name}</td>
                  <td>{rupiah(w.amount)}</td>
                  <td>{w.bank_name} · {w.account_number}<p className="text-xs text-gray-500">a.n. {w.account_name}</p></td>
                  <td><Badge color={COLOR[w.status]}>{w.status}</Badge></td>
                  <td className="text-xs">{w.admin_note}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    {w.status === 'pending' && (
                      <>
                        <button className="text-green-600" onClick={() => process(w, 'approved')}>Setujui</button>
                        <button className="text-red-600" onClick={() => process(w, 'rejected')}>Tolak</button>
                      </>
                    )}
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
