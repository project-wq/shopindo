import { useState } from 'react'
import { Badge, Empty, ErrorBox, Field, Modal, Pagination, Spinner } from './ui'
import { useToast } from '../context/ToastContext'
import api, { errorMessage } from '../lib/api'
import { dateTime, rupiah, toLocalInput, voucherLabel } from '../lib/format'
import useFetch from '../lib/useFetch'

const blank = () => ({
  code: '',
  name: '',
  type: 'fixed',
  value: '',
  max_discount: '',
  min_purchase: 0,
  quota: 100,
  per_user_limit: 1,
  starts_at: toLocalInput(new Date()),
  ends_at: toLocalInput(new Date(Date.now() + 7 * 864e5)),
  is_active: true,
})

export default function VoucherManager({ endpoint, allowFreeShipping = false, title }) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch(endpoint, { page })
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    const payload = { ...form, max_discount: form.max_discount || null, code: form.code.toUpperCase() }
    try {
      if (form.id) await api.put(`${endpoint}/${form.id}`, payload)
      else await api.post(endpoint, payload)
      setForm(null)
      toast('Voucher disimpan')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const remove = async (v) => {
    if (!window.confirm(`Hapus voucher ${v.code}?`)) return
    await api.delete(`${endpoint}/${v.id}`)
    reload()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button className="btn-primary" onClick={() => setForm(blank())}>+ Buat Voucher</button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty title="Belum ada voucher" /> : (
          <table className="table">
            <thead><tr><th>Kode</th><th>Nama / Benefit</th><th>Min. Belanja</th><th>Terpakai</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.data.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono font-semibold">{v.code}</td>
                  <td>{v.name}<p className="text-xs text-brand">{voucherLabel(v)}</p></td>
                  <td>{rupiah(v.min_purchase)}</td>
                  <td>{v.used_count}/{v.quota}</td>
                  <td className="text-xs">{dateTime(v.starts_at)}<br />s/d {dateTime(v.ends_at)}</td>
                  <td>{v.is_active ? <Badge color="bg-green-100 text-green-700">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                  <td className="space-x-3 whitespace-nowrap text-blue-600">
                    <button onClick={() => setForm({ ...v, max_discount: v.max_discount || '', starts_at: toLocalInput(v.starts_at), ends_at: toLocalInput(v.ends_at) })}>Ubah</button>
                    <button onClick={() => remove(v)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Voucher' : 'Voucher Baru'}>
        {form && (
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><ErrorBox message={error} /></div>
            <Field label="Kode (huruf/angka)"><input className="input uppercase" required minLength={4} maxLength={32} pattern="[A-Za-z0-9]+" value={form.code} onChange={set('code')} /></Field>
            <Field label="Nama"><input className="input" required maxLength={100} value={form.name} onChange={set('name')} /></Field>
            <Field label="Tipe">
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="fixed">Potongan nominal</option>
                <option value="percentage">Diskon persen</option>
                {allowFreeShipping && <option value="free_shipping">Gratis ongkir</option>}
              </select>
            </Field>
            <Field label={form.type === 'percentage' ? 'Nilai (%)' : 'Nilai (Rp)'}><input type="number" className="input" required min={1} value={form.value} onChange={set('value')} /></Field>
            <Field label="Maks. potongan (Rp, opsional)"><input type="number" className="input" min={1} value={form.max_discount} onChange={set('max_discount')} /></Field>
            <Field label="Min. belanja (Rp)"><input type="number" className="input" required min={0} value={form.min_purchase} onChange={set('min_purchase')} /></Field>
            <Field label="Kuota"><input type="number" className="input" required min={1} value={form.quota} onChange={set('quota')} /></Field>
            <Field label="Batas per pembeli"><input type="number" className="input" required min={1} value={form.per_user_limit} onChange={set('per_user_limit')} /></Field>
            <Field label="Mulai"><input type="datetime-local" className="input" required value={form.starts_at} onChange={set('starts_at')} /></Field>
            <Field label="Berakhir"><input type="datetime-local" className="input" required value={form.ends_at} onChange={set('ends_at')} /></Field>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> Aktif</label>
            <button className="btn-primary col-span-2">Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
