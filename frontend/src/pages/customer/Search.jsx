import { useSearchParams } from 'react-router-dom'
import ProductCard from '../../components/ProductCard'
import { Empty, Pagination, Spinner } from '../../components/ui'
import useFetch from '../../lib/useFetch'

const SORTS = [
  ['relevance', 'Terkait'],
  ['latest', 'Terbaru'],
  ['sales', 'Terlaris'],
  ['price_asc', 'Harga ↑'],
  ['price_desc', 'Harga ↓'],
  ['rating', 'Rating'],
]

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = Object.fromEntries(params.entries())
  const { data, loading } = useFetch('/products', { per_page: 30, ...query })
  const { data: categories } = useFetch('/categories')

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === null || value === undefined) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const applyPrice = (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    const next = new URLSearchParams(params)
    ;['min_price', 'max_price'].forEach((k) => (f.get(k) ? next.set(k, f.get(k)) : next.delete(k)))
    next.delete('page')
    setParams(next)
  }

  return (
    <div className="flex gap-5">
      <aside className="hidden w-52 shrink-0 space-y-6 text-sm md:block">
        <div>
          <h3 className="mb-2 font-bold">☰ Kategori</h3>
          <button onClick={() => set('category', '')} className={`block py-1 ${!query.category ? 'font-medium text-brand' : ''}`}>Semua</button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => set('category', c.slug)} className={`block py-1 text-left ${query.category === c.slug ? 'font-medium text-brand' : ''}`}>
              {c.name}
            </button>
          ))}
        </div>
        <form onSubmit={applyPrice} key={`${query.min_price}-${query.max_price}`}>
          <h3 className="mb-2 font-bold">Batas Harga</h3>
          <div className="flex items-center gap-1">
            <input name="min_price" type="number" min="0" defaultValue={query.min_price} placeholder="Rp MIN" className="input py-1" />
            <span>-</span>
            <input name="max_price" type="number" min="0" defaultValue={query.max_price} placeholder="Rp MAKS" className="input py-1" />
          </div>
          <button className="btn-primary mt-2 w-full">Terapkan</button>
        </form>
        <div>
          <h3 className="mb-2 font-bold">Penilaian</h3>
          {[5, 4, 3].map((r) => (
            <button key={r} onClick={() => set('rating', query.rating == r ? '' : r)} className={`block py-1 ${query.rating == r ? 'text-brand' : ''}`}>
              {'★'.repeat(r)}{'☆'.repeat(5 - r)} {r < 5 && 'ke atas'}
            </button>
          ))}
        </div>
        <div>
          <h3 className="mb-2 font-bold">Kondisi</h3>
          {[['new', 'Baru'], ['used', 'Bekas']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={query.condition === v} onChange={(e) => set('condition', e.target.checked ? v : '')} /> {l}
            </label>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {query.q && (
          <p className="mb-3 text-sm text-gray-600">
            Hasil pencarian untuk &apos;<span className="text-brand">{query.q}</span>&apos;
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2 bg-gray-200/70 px-4 py-3 text-sm">
          <span className="text-gray-600">Urutkan</span>
          {SORTS.map(([v, l]) => (
            <button key={v} onClick={() => set('sort', v)} className={`rounded-sm px-4 py-1.5 ${(query.sort || 'relevance') === v ? 'bg-brand text-white' : 'bg-white'}`}>
              {l}
            </button>
          ))}
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {data?.sponsored?.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {data.sponsored.map((p) => (
                  <ProductCard key={`ad-${p.id}`} product={p} />
                ))}
              </div>
            )}
            {data?.data?.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {data.data.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <Empty title="Produk tidak ditemukan" />
            )}
            <Pagination data={data} onPage={(p) => set('page', p)} />
          </>
        )}
      </div>
    </div>
  )
}
