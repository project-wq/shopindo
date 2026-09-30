<?php

use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderService;
use App\Services\Shipping\ShippingService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('marketplace:expire-payments', function (OrderService $orders) {
    Payment::where('status', 'pending')->where('expires_at', '<', now())->each(
        fn (Payment $payment) => $orders->failPayment($payment, 'expired', 'Batas waktu pembayaran habis')
    );
})->purpose('Membatalkan pesanan yang tidak dibayar hingga batas waktu');

Artisan::command('marketplace:cancel-unprocessed', function (OrderService $orders) {
    Order::with('shop')->where('status', 'paid')->where('paid_at', '<', now()->subDays(config('marketplace.seller_process_days')))->each(
        fn (Order $order) => $orders->cancelBySeller($order, 'Penjual tidak memproses pesanan tepat waktu')
    );
})->purpose('Membatalkan otomatis pesanan yang tidak diproses penjual');

Artisan::command('marketplace:sync-tracking', function (OrderService $orders, ShippingService $shipping) {
    Order::where('status', 'shipped')->whereNotNull('tracking_number')->each(function (Order $order) use ($orders, $shipping) {
        try {
            if ($shipping->track($order->tracking_number, $order->courier_code)['delivered']) {
                $orders->markDelivered($order);
            }
        } catch (Throwable $e) {
            Log::info('Tracking sync failed', ['order' => $order->order_number, 'error' => $e->getMessage()]);
        }
    });
})->purpose('Sinkronisasi status resi dari RajaOngkir');

Artisan::command('marketplace:auto-complete', function (OrderService $orders) {
    $days = config('marketplace.auto_complete_days');
    Order::whereIn('status', ['shipped', 'delivered'])->where('shipped_at', '<', now()->subDays($days))->each(
        fn (Order $order) => $orders->complete($order)
    );
})->purpose('Menyelesaikan otomatis pesanan setelah N hari dikirim');

Schedule::command('marketplace:expire-payments')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('marketplace:cancel-unprocessed')->hourly()->withoutOverlapping();
Schedule::command('marketplace:sync-tracking')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('marketplace:auto-complete')->hourly()->withoutOverlapping();
