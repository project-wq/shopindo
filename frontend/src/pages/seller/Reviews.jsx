import { useState } from 'react'
import { Empty, Pagination, Spinner, Stars } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Reviews() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/seller/reviews', { page })
  const [replies, setReplies] = useState({})

  const reply = async (r) => {
    try {
      await api.post(`/seller/reviews/${r.id}/reply`, { reply: replies[r.id] })
      toast('Balasan terkirim')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">⭐ Penilaian Toko</h1>
      <div className="card divide-y">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty title="Belum ada penilaian" /> : data.data.map((r) => (
          <div key={r.id} className="p-5 text-sm">
            <div className="flex justify-between">
              <p><b>{r.user?.name}</b> · {r.product?.name}</p>
              <span className="text-xs text-gray-400">{dateTime(r.created_at)}</span>
            </div>
            <Stars value={r.rating} size="text-sm" />
            <p className="mt-1">{r.comment}</p>
            {r.seller_reply ? (
              <p className="mt-2 rounded bg-gray-50 p-2 text-xs"><b>Balasan Anda:</b> {r.seller_reply}</p>
            ) : (
              <div className="mt-2 flex gap-2">
                <input className="input" maxLength={1000} placeholder="Balas penilaian..." value={replies[r.id] || ''} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} />
                <button className="btn-primary" disabled={!replies[r.id]} onClick={() => reply(r)}>Balas</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination data={data} onPage={setPage} />
    </div>
  )
}
