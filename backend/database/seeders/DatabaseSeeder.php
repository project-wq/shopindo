<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Category;
use App\Models\FlashSale;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create(['name' => 'Super Admin', 'email' => 'admin@shopindo.test', 'password' => 'password123']);
        $admin->forceFill(['role' => 'admin', 'email_verified_at' => now()])->save();

        $customer = User::create(['name' => 'Budi Pembeli', 'email' => 'customer@shopindo.test', 'phone' => '081234567890', 'password' => 'password123']);
        $customer->addresses()->create([
            'label' => 'Rumah', 'recipient_name' => 'Budi Pembeli', 'phone' => '081234567890',
            'destination_id' => 2001, 'destination_label' => 'Coblong, Coblong, Bandung, Jawa Barat',
            'postal_code' => '40132', 'address_line' => 'Jl. Dago No. 10', 'is_default' => true,
        ]);

        $categories = collect([
            ['Elektronik', '📱'], ['Fashion Pria', '👕'], ['Fashion Wanita', '👗'], ['Kesehatan & Kecantikan', '💄'],
            ['Rumah Tangga', '🏠'], ['Makanan & Minuman', '🍜'], ['Olahraga', '⚽'], ['Hobi & Mainan', '🎮'],
            ['Otomotif', '🏍️'], ['Buku & Alat Tulis', '📚'],
        ])->map(fn ($c, $i) => Category::create(['name' => $c[0], 'slug' => Str::slug($c[0]), 'icon' => $c[1], 'sort_order' => $i]));

        $shops = collect([
            ['seller@shopindo.test', 'Toko Elektronik Jaya', 1001, 'Gambir, Gambir, Jakarta Pusat, DKI Jakarta', true],
            ['seller2@shopindo.test', 'Fashion Kita Official', 3001, 'Genteng, Genteng, Surabaya, Jawa Timur', false],
            ['seller3@shopindo.test', 'Dapur Nusantara', 5001, 'Gondokusuman, Gondokusuman, Yogyakarta, DI Yogyakarta', false],
        ])->map(function ($s, $i) {
            $user = User::create(['name' => 'Seller '.($i + 1), 'email' => $s[0], 'phone' => '08111111111'.$i, 'password' => 'password123']);
            $user->forceFill(['role' => 'seller'])->save();
            $shop = $user->shop()->create([
                'name' => $s[1], 'slug' => Str::slug($s[1]), 'description' => 'Selamat datang di '.$s[1].'. Produk original & bergaransi.',
                'phone' => $user->phone, 'origin_destination_id' => $s[2], 'origin_label' => $s[3], 'address' => 'Jl. Merdeka No. '.($i + 1),
            ]);
            $shop->forceFill(['status' => 'active', 'is_official' => $s[4], 'balance' => 250000])->save();

            return $shop;
        });

        $catalog = [
            [0, 0, 'Smartphone Android 8/256GB Kamera 108MP', 3499000, 450, [['Hitam', 3499000], ['Biru', 3499000], ['12/512GB Hitam', 4299000]]],
            [0, 0, 'TWS Earbuds Bluetooth 5.3 Noise Cancelling', 299000, 120, []],
            [0, 0, 'Powerbank 20000mAh Fast Charging 22.5W', 189000, 400, []],
            [0, 0, 'Smartwatch Layar AMOLED Tahan Air', 549000, 150, []],
            [0, 0, 'Kabel Data USB Type-C 100W 1 Meter', 39000, 50, []],
            [0, 0, 'Laptop Stand Aluminium Adjustable', 159000, 800, []],
            [1, 1, 'Kaos Polos Cotton Combed 30s Premium', 49000, 200, [['S', 49000], ['M', 49000], ['L', 49000], ['XL', 55000]]],
            [1, 1, 'Kemeja Flanel Pria Lengan Panjang', 129000, 300, [['M', 129000], ['L', 129000], ['XL', 139000]]],
            [1, 2, 'Gamis Wanita Syari Busui Friendly', 189000, 400, [['All Size Navy', 189000], ['All Size Maroon', 189000]]],
            [1, 2, 'Tas Selempang Wanita Kulit Sintetis', 99000, 350, []],
            [1, 6, 'Sepatu Running Pria Ringan Breathable', 279000, 700, [['40', 279000], ['41', 279000], ['42', 279000], ['43', 279000]]],
            [1, 3, 'Serum Wajah Niacinamide 10% 30ml', 79000, 100, []],
            [2, 5, 'Keripik Singkong Pedas Level 5 250gr', 25000, 260, []],
            [2, 5, 'Kopi Arabika Gayo Bubuk 200gr', 85000, 220, []],
            [2, 4, 'Set Panci Stainless 5 in 1', 349000, 3000, []],
            [2, 5, 'Sambal Bawang Botol Homemade 200ml', 32000, 300, []],
            [2, 4, 'Rice Cooker Digital 1.8L Anti Lengket', 459000, 2500, []],
            [2, 9, 'Buku Resep Masakan Nusantara', 89000, 400, []],
        ];

        $products = collect($catalog)->map(function ($p, $i) use ($shops, $categories) {
            $product = new Product([
                'category_id' => $categories[$p[1]]->id,
                'name' => $p[2],
                'slug' => Str::slug($p[2]).'-'.Str::lower(Str::random(5)),
                'description' => $p[2].".\n\nProduk berkualitas dengan harga terbaik. Dikirim cepat dari gudang kami. Garansi uang kembali jika produk tidak sesuai.",
                'price' => $p[3],
                'stock' => 100,
                'weight' => $p[4],
                'condition' => 'new',
                'status' => 'active',
            ]);
            $product->shop_id = $shops[$p[0]]->id;
            $product->sold_count = random_int(5, 2000);
            $product->rating_avg = random_int(40, 50) / 10;
            $product->rating_count = random_int(1, 500);
            $product->save();

            foreach (range(1, 3) as $n) {
                $product->images()->create(['url' => "https://picsum.photos/seed/shopindo{$i}x{$n}/600/600", 'sort_order' => $n]);
            }
            foreach ($p[5] as $v) {
                $product->variants()->create(['name' => $v[0], 'price' => $v[1], 'stock' => 30]);
            }
            if ($p[5]) {
                $product->update(['price' => min(array_column($p[5], 1)), 'stock' => 30 * count($p[5])]);
            }

            return $product;
        });

        $flash = FlashSale::create(['name' => 'Flash Sale Spesial', 'starts_at' => now()->subHour(), 'ends_at' => now()->addHours(5)]);
        foreach ([1, 2, 4, 6, 12, 13] as $idx) {
            $product = $products[$idx];
            $item = $flash->items()->create([
                'product_id' => $product->id,
                'flash_price' => (int) (round($product->price * 0.6 / 100) * 100),
                'stock' => 20,
                'max_per_user' => 2,
            ]);
            $item->forceFill(['status' => 'approved', 'sold' => random_int(1, 15)])->save();
        }
        FlashSale::create(['name' => 'Flash Sale Tengah Malam', 'starts_at' => now()->addHours(6), 'ends_at' => now()->addHours(8)]);

        Voucher::create(['code' => 'GRATISONGKIR', 'name' => 'Gratis Ongkir s/d 20RB', 'type' => 'free_shipping', 'value' => 20000, 'max_discount' => 20000, 'min_purchase' => 50000, 'quota' => 1000, 'per_user_limit' => 5, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth()]);
        Voucher::create(['code' => 'HEMAT10', 'name' => 'Diskon 10% s/d 50RB', 'type' => 'percentage', 'value' => 10, 'max_discount' => 50000, 'min_purchase' => 100000, 'quota' => 500, 'per_user_limit' => 1, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth()]);
        $shops[0]->vouchers()->create(['code' => 'JAYA25K', 'name' => 'Potongan 25RB', 'type' => 'fixed', 'value' => 25000, 'min_purchase' => 200000, 'quota' => 100, 'per_user_limit' => 1, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth()]);

        foreach ([['Belanja Hemat Akhir Bulan', 'banner1'], ['Gratis Ongkir Se-Indonesia', 'banner2'], ['Flash Sale Setiap Hari', 'banner3']] as $i => $b) {
            Banner::create(['title' => $b[0], 'image' => "https://picsum.photos/seed/{$b[1]}/1200/400", 'link' => '/search', 'sort_order' => $i]);
        }
    }
}
