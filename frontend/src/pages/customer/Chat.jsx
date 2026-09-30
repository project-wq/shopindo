import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Empty } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime } from '../../lib/format'

export default function Chat({ asSeller = false }) {
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const activeId = Number(params.get('c')) || null
  const [conversations, setConversations] = useState([])
  const [thread, setThread] = useState(null)
  const [body, setBody] = useState('')
  const bottomRef = useRef(null)

  const loadList = useCallback(async () => {
    const { data } = await api.get('/chats', { params: { as_seller: asSeller ? 1 : 0 } })
    setConversations(data)
  }, [asSeller])

  const loadThread = useCallback(async () => {
    if (!activeId) return
    const { data } = await api.get(`/chats/${activeId}`)
    setThread(data)
  }, [activeId])

  useEffect(() => {
    loadList().catch(() => {})
    const t = setInterval(() => loadList().catch(() => {}), 15000)
    return () => clearInterval(t)
  }, [loadList])

  useEffect(() => {
    setThread(null)
    loadThread().catch(() => {})
    const t = setInterval(() => loadThread().catch(() => {}), 5000)
    return () => clearInterval(t)
  }, [loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages?.length])

  const send = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    try {
      await api.post(`/chats/${activeId}`, { body: body.trim() })
      setBody('')
      loadThread()
      loadList()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const title = (c) => (asSeller ? c.user?.name : c.shop?.name)

  return (
    <div className="card grid h-[70vh] grid-cols-[260px_1fr] overflow-hidden">
      <aside className="overflow-y-auto border-r">
        <h2 className="border-b px-4 py-3 font-medium text-brand">💬 Chat</h2>
        {conversations.length === 0 && <p className="p-4 text-sm text-gray-500">Belum ada percakapan.</p>}
        {conversations.map((c) => (
          <button key={c.id} onClick={() => setParams({ c: c.id })} className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm ${c.id === activeId ? 'bg-brand-light' : 'hover:bg-gray-50'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">{asSeller ? '👤' : '🏪'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{title(c)}</span>
              <span className="block truncate text-xs text-gray-500">{c.latest_message?.body}</span>
            </span>
            {c.unread_count > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{c.unread_count}</span>}
          </button>
        ))}
      </aside>
      <section className="flex min-h-0 flex-col">
        {!activeId || !thread ? (
          <Empty title="Pilih percakapan" />
        ) : (
          <>
            <div className="border-b px-4 py-3 font-medium">{asSeller ? thread.conversation.user?.name : thread.conversation.shop?.name}</div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
              {thread.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user.id ? 'bg-brand-light' : 'bg-white shadow-sm'}`}>
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-right text-[10px] text-gray-400">{dateTime(m.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t p-3">
              <input className="input" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tulis pesan..." />
              <button className="btn-primary">Kirim</button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
