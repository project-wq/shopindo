export default function Footer() {
  return (
    <footer className="mt-12 border-t-4 border-brand bg-white py-10 text-sm text-gray-600">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
        <div>
          <h4 className="mb-3 font-semibold text-gray-800">Layanan Pelanggan</h4>
          <ul className="space-y-1">
            <li>Bantuan</li>
            <li>Metode Pembayaran</li>
            <li>Lacak Pesanan</li>
            <li>Pengembalian Barang</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-gray-800">Jelajahi ShopIndo</h4>
          <ul className="space-y-1">
            <li>Tentang Kami</li>
            <li>Kebijakan Privasi</li>
            <li>Flash Sale</li>
            <li>Seller Centre</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-gray-800">Pembayaran</h4>
          <p>Virtual Account, QRIS, GoPay, OVO, DANA, ShopeePay, Kartu Kredit, Alfamart/Indomaret (via Midtrans / Xendit)</p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-gray-800">Pengiriman</h4>
          <p>JNE, J&amp;T, SiCepat, AnterAja, POS Indonesia, TIKI, Ninja Xpress (ongkir otomatis via RajaOngkir)</p>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-gray-400">© {new Date().getFullYear()} ShopIndo. Hak Cipta Dilindungi.</p>
    </footer>
  )
}
