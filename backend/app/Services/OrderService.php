<?php

namespace App\Services;

use App\Models\FlashSaleItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\UserNotification;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use DomainException;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function markPaymentPaid(Payment $payment, ?string $method = null, array $raw = []): void
    {
        DB::transaction(function () use ($payment, $method, $raw) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status === 'paid') {
                return;
            }
            if ($payment->status !== 'pending') {
                // Pembayaran masuk setelah pesanan kedaluwarsa: tandai paid agar admin dapat melakukan refund manual.
                $payment->update(['status' => 'paid', 'method' => $method, 'paid_at' => now(), 'raw_response' => $raw ?: $payment->raw_response]);
                UserNotification::send($payment->user_id, 'payment', 'Pembayaran diterima setelah kedaluwarsa',
                    "Pembayaran {$payment->code} diterima setelah pesanan dibatalkan. Dana akan dikembalikan oleh admin.");

                return;
            }

            $payment->update(['status' => 'paid', 'method' => $method, 'paid_at' => now(), 'raw_response' => $raw ?: $payment->raw_response]);

            foreach ($payment->orders()->with(['items', 'shop'])->get() as $order) {
                if ($order->status !== 'pending_payment') {
                    continue;
                }
                $order->update(['status' => 'paid', 'paid_at' => now()]);

                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        Product::withTrashed()->whereKey($item->product_id)->increment('sold_count', $item->quantity);
                    }
                }

                UserNotification::send($order->shop->user_id, 'order', 'Pesanan baru',
                    "Pesanan {$order->order_number} telah dibayar. Segera proses pesanan.", ['order_id' => $order->id]);
            }

            UserNotification::send($payment->user_id, 'payment', 'Pembayaran berhasil',
                "Pembayaran {$payment->code} berhasil. Pesanan Anda diteruskan ke penjual.", ['payment_code' => $payment->code]);
        });
    }

    public function failPayment(Payment $payment, string $status, string $reason): void
    {
        DB::transaction(function () use ($payment, $status, $reason) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status !== 'pending') {
                return;
            }
            $payment->update(['status' => $status]);

            foreach ($payment->orders()->with('items')->get() as $order) {
                if ($order->status === 'pending_payment') {
                    $this->cancelInternal($order, $reason);
                }
            }

            $this->releaseVouchers($payment);
        });
    }

    public function cancelByBuyer(Order $order, string $reason): void
    {
        if ($order->status === 'pending_payment') {
            $this->failPayment($order->payment, 'failed', $reason);

            return;
        }

        if ($order->status !== 'paid') {
            throw new DomainException('Pesanan yang sudah diproses penjual tidak dapat dibatalkan.');
        }

        DB::transaction(fn () => $this->cancelInternal($order, $reason));
        UserNotification::send($order->shop->user_id, 'order', 'Pesanan dibatalkan pembeli',
            "Pesanan {$order->order_number} dibatalkan oleh pembeli.", ['order_id' => $order->id]);
    }

    public function cancelBySeller(Order $order, string $reason): void
    {
        if (! in_array($order->status, ['paid', 'processing'], true)) {
            throw new DomainException('Pesanan tidak dapat dibatalkan pada status ini.');
        }

        DB::transaction(fn () => $this->cancelInternal($order, $reason));
        UserNotification::send($order->user_id, 'order', 'Pesanan dibatalkan penjual',
            "Pesanan {$order->order_number} dibatalkan penjual: {$reason}. Dana akan dikembalikan.", ['order_id' => $order->id]);
    }

    public function process(Order $order): void
    {
        if ($order->status !== 'paid') {
            throw new DomainException('Hanya pesanan yang sudah dibayar yang dapat diproses.');
        }
        $order->update(['status' => 'processing']);
        UserNotification::send($order->user_id, 'order', 'Pesanan dikemas',
            "Pesanan {$order->order_number} sedang dikemas penjual.", ['order_id' => $order->id]);
    }

    public function ship(Order $order, string $trackingNumber): void
    {
        if (! in_array($order->status, ['paid', 'processing'], true)) {
            throw new DomainException('Pesanan tidak dapat dikirim pada status ini.');
        }
        $order->update(['status' => 'shipped', 'tracking_number' => $trackingNumber, 'shipped_at' => now()]);
        UserNotification::send($order->user_id, 'order', 'Pesanan dikirim',
            "Pesanan {$order->order_number} dikirim via {$order->courier_name} ({$trackingNumber}).", ['order_id' => $order->id]);
    }

    public function markDelivered(Order $order): void
    {
        if ($order->status !== 'shipped') {
            return;
        }
        $order->update(['status' => 'delivered', 'delivered_at' => now()]);
        UserNotification::send($order->user_id, 'order', 'Pesanan tiba',
            "Pesanan {$order->order_number} telah tiba. Konfirmasi penerimaan & beri ulasan ya!", ['order_id' => $order->id]);
    }

    public function complete(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->with('shop')->firstOrFail();
            if (! in_array($order->status, ['shipped', 'delivered'], true)) {
                throw new DomainException('Pesanan belum dapat diselesaikan.');
            }
            $order->update(['status' => 'completed', 'completed_at' => now(), 'delivered_at' => $order->delivered_at ?? now()]);

            $order->shop->credit($order->sellerIncome(), "Penghasilan pesanan {$order->order_number}", $order);

            UserNotification::send($order->shop->user_id, 'finance', 'Dana masuk',
                "Penghasilan pesanan {$order->order_number} sebesar Rp".number_format($order->sellerIncome(), 0, ',', '.').' masuk ke saldo.',
                ['order_id' => $order->id]);
        });
    }

    private function cancelInternal(Order $order, string $reason): void
    {
        $order->loadMissing('items');
        $wasPaid = $order->status !== 'pending_payment';

        foreach ($order->items as $item) {
            if ($item->product_variant_id) {
                ProductVariant::whereKey($item->product_variant_id)->increment('stock', $item->quantity);
            } elseif ($item->product_id) {
                Product::withTrashed()->whereKey($item->product_id)->increment('stock', $item->quantity);
            }
            if ($item->flash_sale_item_id) {
                FlashSaleItem::whereKey($item->flash_sale_item_id)->where('sold', '>=', $item->quantity)->decrement('sold', $item->quantity);
            }
            if ($wasPaid && $item->product_id) {
                Product::withTrashed()->whereKey($item->product_id)->where('sold_count', '>=', $item->quantity)->decrement('sold_count', $item->quantity);
            }
        }

        $order->update(['status' => 'cancelled', 'cancel_reason' => $reason, 'cancelled_at' => now()]);
    }

    private function releaseVouchers(Payment $payment): void
    {
        foreach (VoucherUsage::where('payment_id', $payment->id)->get() as $usage) {
            Voucher::whereKey($usage->voucher_id)->where('used_count', '>', 0)->decrement('used_count');
            $usage->delete();
        }
    }
}
