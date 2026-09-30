export const rupiah = (value) =>
  'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0))

export const shortNumber = (value) => {
  const n = Number(value || 0)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'JT'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'RB'
  return String(n)
}

export const dateTime = (value) =>
  value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'

export const dateOnly = (value) => (value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-')

export const toLocalInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export const ORDER_STATUS = {
  pending_payment: { label: 'Belum Bayar', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Dikemas', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Diproses', color: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: 'Dikirim', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Sampai', color: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-200 text-gray-600' },
}

export const voucherLabel = (v) => {
  if (v.type === 'percentage') return `Diskon ${v.value}%` + (v.max_discount ? ` s/d ${rupiah(v.max_discount)}` : '')
  if (v.type === 'free_shipping') return `Gratis Ongkir s/d ${rupiah(v.max_discount || v.value)}`
  return `Potongan ${rupiah(v.value)}`
}
