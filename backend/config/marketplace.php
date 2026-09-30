<?php

return [
    'frontend_url' => explode(',', env('FRONTEND_URL', 'http://localhost:5173'))[0],

    // Persentase komisi platform dari subtotal produk (setelah diskon toko).
    'commission_percent' => (float) env('MARKETPLACE_COMMISSION_PERCENT', 5),

    // Gateway pembayaran aktif: midtrans | xendit | mock (mock hanya untuk development).
    'payment_gateway' => env('PAYMENT_GATEWAY', 'mock'),

    // Driver ongkir: rajaongkir | mock.
    'shipping_driver' => env('SHIPPING_DRIVER', 'mock'),

    'payment_expiry_minutes' => (int) env('PAYMENT_EXPIRY_MINUTES', 60 * 24),

    // Pesanan dikirim otomatis selesai setelah N hari jika pembeli tidak konfirmasi.
    'auto_complete_days' => (int) env('ORDER_AUTO_COMPLETE_DAYS', 7),

    // Pesanan yang sudah dibayar otomatis dibatalkan jika seller tidak memproses dalam N hari.
    'seller_process_days' => (int) env('ORDER_SELLER_PROCESS_DAYS', 3),

    'min_withdrawal' => (int) env('MIN_WITHDRAWAL', 50000),
];
