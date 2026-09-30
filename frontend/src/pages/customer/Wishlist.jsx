import ProductCard from '../../components/ProductCard'
import { Empty, Spinner } from '../../components/ui'
import useFetch from '../../lib/useFetch'

export default function Wishlist() {
  const { data, loading } = useFetch('/wishlist')
  if (loading) return <Spinner />
  return (
    <div>
      <h1 className="mb-3 text-lg">❤️ Produk Favorit</h1>
      {data?.data?.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {data.data.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <Empty title="Belum ada produk favorit" />
      )}
    </div>
  )
}
