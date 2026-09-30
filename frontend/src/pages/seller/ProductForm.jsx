import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Field, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage, toFormData } from '../../lib/api'
import useFetch from '../../lib/useFetch'

const empty = { category_id: '', name: '', description: '', price: '', stock: '', weight: '', condition: 'new', status: 'active' }

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: categories } = useFetch('/categories')
  const [form, setForm] = useState(empty)
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [urls, setUrls] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/seller/products/${id}`).then(({ data: { data: p } }) => {
      setForm({ category_id: p.category_id, name: p.name, description: p.description, price: p.price, stock: p.stock, weight: p.weight, condition: p.condition, status: p.status })
      setImages(p.images)
      setVariants(p.variants)
      setLoading(false)
    })
  }, [id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const totalImages = images.length + files.length + urls.length

  const submit = async (e) => {
    e.preventDefault()
    if (!totalImages) return setError('Tambahkan minimal 1 foto produk')
    setBusy(true)
    setError('')
    try {
      const payload = toFormData({
        ...form,
        images: files,
        image_urls: urls,
        keep_image_ids: id ? images.map((i) => i.id) : undefined,
        variants: variants.length ? variants.map(({ id: vid, name, sku, price, stock }) => ({ id: vid, name, sku, price, stock })) : undefined,
      })
      await api.post(id ? `/seller/products/${id}` : '/seller/products', payload)
      toast('Produk disimpan')
      navigate('/seller/products')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">{id ? 'Ubah Produk' : 'Tambah Produk Baru'}</h1>
      <ErrorBox message={error} />

      <div className="card space-y-4 p-6">
        <h2 className="font-medium">Informasi Produk</h2>
        <Field label={`Foto produk (${totalImages}/9) — JPG/PNG/WEBP maks. 2MB`}>
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <Thumb key={img.id} src={img.url} onRemove={() => setImages(images.filter((i) => i.id !== img.id))} />
            ))}
            {urls.map((u) => (
              <Thumb key={u} src={u} onRemove={() => setUrls(urls.filter((x) => x !== u))} />
            ))}
            {files.map((f, i) => (
              <Thumb key={i} src={URL.createObjectURL(f)} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
            ))}
            {totalImages < 9 && (
              <span className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border-2 border-dashed border-brand text-xs text-brand">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setFiles([...files, ...Array.from(e.target.files)].slice(0, 9 - images.length - urls.length))}
                />
                + Upload
              </span>
            )}
          </div>
        </Field>
        <div className="flex gap-2">
          <input className="input" placeholder="atau tempel URL gambar (https://...)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (/^https:\/\//.test(imageUrl) && totalImages < 9) setUrls([...urls, imageUrl])
              setImageUrl('')
            }}
          >
            Tambah
          </button>
        </div>
        <Field label="Nama produk"><input className="input" required minLength={5} maxLength={200} value={form.name} onChange={set('name')} /></Field>
        <Field label="Kategori">
          <select className="input" required value={form.category_id} onChange={set('category_id')}>
            <option value="">-- Pilih kategori --</option>
            {categories?.map((c) => (
              <optgroup key={c.id} label={c.name}>
                <option value={c.id}>{c.name}</option>
                {c.children?.map((ch) => <option key={ch.id} value={ch.id}>— {ch.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Deskripsi (min. 20 karakter)"><textarea className="input" rows={6} required minLength={20} maxLength={5000} value={form.description} onChange={set('description')} /></Field>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-medium">Harga, Stok & Pengiriman</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Harga (Rp)"><input type="number" className="input" required min={100} value={form.price} onChange={set('price')} /></Field>
          <Field label="Stok"><input type="number" className="input" required min={0} value={form.stock} onChange={set('stock')} /></Field>
          <Field label="Berat (gram)"><input type="number" className="input" required min={1} max={50000} value={form.weight} onChange={set('weight')} /></Field>
          <Field label="Kondisi">
            <select className="input" value={form.condition} onChange={set('condition')}><option value="new">Baru</option><option value="used">Bekas</option></select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}><option value="active">Tampilkan</option><option value="inactive">Arsipkan</option></select>
          </Field>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Variasi (opsional — jika diisi, harga & stok mengikuti variasi)</span>
            <button type="button" className="btn-outline py-1 text-xs" onClick={() => setVariants([...variants, { name: '', sku: '', price: form.price, stock: 0 }])}>+ Variasi</button>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_120px_100px_40px] gap-2">
              {['name', 'sku', 'price', 'stock'].map((k) => (
                <input
                  key={k}
                  className="input"
                  required={k !== 'sku'}
                  type={['price', 'stock'].includes(k) ? 'number' : 'text'}
                  placeholder={{ name: 'Nama (mis. Merah / XL)', sku: 'SKU', price: 'Harga', stock: 'Stok' }[k]}
                  value={v[k] ?? ''}
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                />
              ))}
              <button type="button" className="text-red-500" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Batal</button>
        <button disabled={busy} className="btn-primary px-10">{busy ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  )
}

function Thumb({ src, onRemove }) {
  return (
    <span className="relative h-24 w-24">
      <img src={src} alt="" className="h-full w-full rounded object-cover" />
      <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-800 text-xs text-white">✕</button>
    </span>
  )
}
