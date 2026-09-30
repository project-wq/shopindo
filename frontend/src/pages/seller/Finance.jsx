import { useState } from 'react'
import { Badge, ErrorBox, Field, Modal, Spinner, StatCard } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const WD_COLOR = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

export default function Finance() {
  const toast = useToast()
  const { data, loading, reload } = useFetch('/seller/finance')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  if (loading || !data) return <Spinner />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/seller/finance/withdraw', form)
      toast('Permintaan penarikan dikirim')
      setForm(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">💰 Keuangan</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon="💰" label="Saldo Penjual" value={rupiah(data.balance)} />
        <div className="card flex items-center p-4 md:col-span-2">
          <p className="flex-1 text-sm text-gray-500">Penghasilan pesanan masuk ke saldo setelah pesanan selesai. Minimal penarikan {rupiah(data.min_withdrawal)}.</p>
          <button className="btn-primary" disabled={data.balance < data.min_withdrawal} onClick={() => setForm({ amount: data.balance, bank_name: 'BCA', account_number: '', account_name: '' })}>Tarik Dana</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">Riwayat Penarikan</h2>
        <table className="table">
          <thead><tr><th>Tanggal</th><th>Jumlah</th><th>Rekening</th><th>Status</th><th>Catatan</th></tr></thead>
          <tbody>
            {data.withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{dateTime(w.created_at)}</td>
                <td>{rupiah(w.amount)}</td>
                <td>{w.bank_name} · {w.account_number} a.n. {w.account_name}</td>
                <td><Badge color={WD_COLOR[w.status]}>{w.status}</Badge></td>
                <td>{w.admin_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">Mutasi Saldo</h2>
        <table className="table">
          <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Jumlah</th><th>Saldo Akhir</th></tr></thead>
          <tbody>
            {data.logs.data.map((l) => (
              <tr key={l.id}>
                <td>{dateTime(l.created_at)}</td>
                <td>{l.description}</td>
                <td className={l.type === 'credit' ? 'text-green-600' : 'text-red-600'}>{l.type === 'credit' ? '+' : '-'}{rupiah(l.amount)}</td>
                <td>{rupiah(l.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Tarik Dana">
        {form && (
          <form onSubmit={submit} className="space-y-3">
            <ErrorBox message={error} />
            <Field label="Jumlah (Rp)"><input type="number" className="input" required min={data.min_withdrawal} max={data.balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Bank">
              <select className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}>
                {['BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga', 'BSI', 'Permata', 'Danamon', 'SeaBank', 'Jago'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="No. rekening"><input className="input" required pattern="[0-9]{6,20}" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></Field>
            <Field label="Nama pemilik rekening"><input className="input" required maxLength={100} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></Field>
            <button className="btn-primary w-full">Ajukan Penarikan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
