import { Link } from 'react-router-dom'
import PanelLayout from '../../components/PanelLayout'
import { Spinner } from '../../components/ui'
import useFetch from '../../lib/useFetch'

const MENU = [
  { to: '/seller', label: 'Dashboard', icon: '📊', end: true },
  { to: '/seller/orders', label: 'Pesanan', icon: '📦' },
  { to: '/seller/products', label: 'Produk Saya', icon: '🛍️' },
  { to: '/seller/vouchers', label: 'Voucher Toko', icon: '🎟️' },
  { to: '/seller/flash-sales', label: 'Flash Sale Toko', icon: '⚡' },
  { to: '/seller/ads', label: 'Iklan ShopIndo', icon: '📢' },
  { to: '/seller/finance', label: 'Keuangan', icon: '💰' },
  { to: '/seller/reviews', label: 'Penilaian', icon: '⭐' },
  { to: '/seller/chat', label: 'Chat', icon: '💬' },
  { to: '/seller/settings', label: 'Pengaturan Toko', icon: '⚙️' },
]

export default function SellerLayout() {
  const { data: shop, loading } = useFetch('/seller/shop')
  if (loading) return <Spinner />
  if (shop && shop.status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="card max-w-md p-8 text-center">
          <p className="text-5xl">{shop.status === 'pending' ? '⏳' : '⛔'}</p>
          <h1 className="mt-4 text-xl font-semibold">{shop.status === 'pending' ? 'Toko sedang diverifikasi' : 'Toko ditangguhkan'}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {shop.status === 'pending'
              ? `Toko ${shop.name} sedang menunggu persetujuan admin. Anda akan menerima notifikasi setelah toko aktif.`
              : 'Hubungi admin ShopIndo untuk informasi lebih lanjut.'}
          </p>
          <Link to="/" className="btn-primary mt-6">Kembali Belanja</Link>
        </div>
      </div>
    )
  }
  return <PanelLayout title="Seller Centre" menu={MENU} />
}
