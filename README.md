# ShopIndo — Marketplace Multi-Vendor ala Shopee

Monorepo berisi dua aplikasi terpisah:

| Folder | Stack | Keterangan |
| --- | --- | --- |
| `backend/` | Laravel 13, PHP 8.3, Sanctum | REST API `/api/v1` |
| `frontend/` | React 19, Vite, React Router, Tailwind 4 | Panel Customer, Seller Centre (`/seller`), Admin (`/admin`) |

## Fitur

- **Customer**: beranda (banner, kategori, flash sale, rekomendasi), pencarian + filter (kategori, harga, rating, kondisi) + urutan, detail produk (variasi, galeri, ulasan), halaman toko + follow, keranjang multi-toko, wishlist, checkout multi-toko (ongkir otomatis per toko, voucher toko + voucher platform/gratis ongkir), pembayaran (Midtrans Snap / Xendit Invoice), pesanan + lacak resi, ulasan, chat dengan penjual, notifikasi, kelola alamat & profil, buka toko.
- **Seller**: dashboard penjualan, produk (upload foto, variasi, stok), pesanan (proses, input resi, batal), voucher toko, daftar flash sale, iklan produk (CPC dipotong dari saldo), keuangan (mutasi saldo, tarik dana), balas ulasan, chat, pengaturan toko.
- **Admin**: dashboard GMV & komisi, verifikasi/tangguhkan toko & Shopee Mall (official), pengguna, moderasi/blokir produk, semua pesanan, kategori, sesi flash sale + approval produk, voucher platform, banner, approval penarikan dana.
- **Otomasi (scheduler)**: pembayaran kedaluwarsa → stok & voucher dikembalikan; pesanan tidak diproses seller dalam N hari dibatalkan otomatis; sinkron status resi; pesanan auto-selesai setelah N hari → saldo seller dikreditkan (dipotong komisi).

## Integrasi

| Layanan | Driver | Variabel `.env` |
| --- | --- | --- |
| Ongkir & lacak resi | `SHIPPING_DRIVER=rajaongkir` (Komerce RajaOngkir V2) atau `mock` | `RAJAONGKIR_API_KEY`, `RAJAONGKIR_BASE_URL`, `RAJAONGKIR_COURIERS` |
| Payment gateway | `PAYMENT_GATEWAY=midtrans` / `xendit` / `mock` | `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN` |

Webhook yang perlu didaftarkan di dashboard gateway:

- Midtrans → Payment Notification URL: `https://<domain-api>/api/v1/webhooks/midtrans`
- Xendit → Invoice callback: `https://<domain-api>/api/v1/webhooks/xendit`

Webhook diverifikasi (signature SHA-512 Midtrans + cek ulang status ke API Midtrans; `x-callback-token` Xendit) dan nominal dicocokkan dengan tagihan sebelum pesanan ditandai lunas.

Mode `mock` dipakai untuk development tanpa kredensial (tombol "Simulasikan Pembayaran" hanya muncul di non-production).

## Keamanan

- **Rate limiting / anti-abuse (lapisan aplikasi)**: global 120 req/menit per user/IP, login/registrasi per email+IP, checkout, chat, webhook, lacak resi, klik iklan, tarik dana. Untuk DDoS volumetrik tetap gunakan CDN/WAF (Cloudflare, dsb.) di depan server.
- **SQL injection**: seluruh query via Eloquent/Query Builder (parameter binding), input `LIKE` di-escape, whitelist nilai `sort`/`status` via validasi.
- **XSS**: middleware menghapus tag HTML dari seluruh input (kecuali password), React meng-escape output, header CSP.
- **Header keamanan**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS (HTTPS).
- **Auth & otorisasi**: token Sanctum dengan masa berlaku, role middleware (`customer`/`seller`/`admin`), cek kepemilikan resource, akun nonaktif ditolak & tokennya dicabut.
- **Integritas transaksi**: harga, ongkir, diskon dihitung ulang di server; stok dikurangi secara atomik (`UPDATE ... WHERE stock >= qty`) saat checkout; kuota voucher & flash sale dikunci (`lockForUpdate`).
- **Upload**: validasi MIME/ukuran gambar, nama file acak.
- **CORS**: hanya `FRONTEND_URL`.

## Menjalankan secara lokal

Prasyarat: PHP 8.3 (ext: sqlite, mbstring, xml, curl, gd/intl), Composer 2, Node 20+.

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link
php artisan serve            # http://localhost:8000

# Scheduler (terminal lain)
php artisan schedule:work

# Frontend
cd ../frontend
npm install
npm run dev                  # http://localhost:5173 (proxy /api → :8000)
```

Akun demo (password `password123`, **hanya untuk development**):

| Role | Email |
| --- | --- |
| Admin | `admin@shopindo.test` |
| Seller | `seller@shopindo.test` |
| Customer | `customer@shopindo.test` |

Voucher demo: `GRATISONGKIR`, `HEMAT10` (platform).

## Pengujian

```bash
cd backend && php artisan test && ./vendor/bin/pint --test
cd frontend && npm run lint && npm run build
```

## Produksi (ringkas)

- Gunakan MySQL/PostgreSQL, Redis untuk cache/queue/rate limiter, `APP_DEBUG=false`, `APP_ENV=production`, HTTPS.
- Jalankan `php artisan schedule:run` via cron setiap menit.
- Isi `TRUSTED_PROXIES` sesuai load balancer/CDN agar IP klien untuk rate limiting akurat.
- Build frontend (`npm run build`) dan sajikan `dist/` via Nginx/CDN; set `VITE_API_URL` ke URL API.
