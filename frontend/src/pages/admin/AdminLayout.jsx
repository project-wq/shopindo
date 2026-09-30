import PanelLayout from '../../components/PanelLayout'

const MENU = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/shops', label: 'Toko & Seller', icon: '🏪' },
  { to: '/admin/users', label: 'Pengguna', icon: '👥' },
  { to: '/admin/products', label: 'Moderasi Produk', icon: '🛍️' },
  { to: '/admin/orders', label: 'Pesanan', icon: '📦' },
  { to: '/admin/categories', label: 'Kategori', icon: '🗂️' },
  { to: '/admin/flash-sales', label: 'Flash Sale', icon: '⚡' },
  { to: '/admin/vouchers', label: 'Voucher Platform', icon: '🎟️' },
  { to: '/admin/banners', label: 'Banner', icon: '🖼️' },
  { to: '/admin/withdrawals', label: 'Penarikan Dana', icon: '💸' },
]

export default function AdminLayout() {
  return <PanelLayout title="Admin Panel" menu={MENU} accent="bg-gray-900" />
}
