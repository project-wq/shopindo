<?php

namespace App\Services;

use App\Models\Address;
use App\Models\CartItem;
use App\Models\FlashSaleItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use App\Services\Payment\PaymentManager;
use App\Services\Shipping\ShippingService;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CheckoutService
{
    public function __construct(
        private readonly ShippingService $shipping,
        private readonly PricingService $pricing,
        private readonly PaymentManager $payments,
        private readonly OrderService $orders,
    ) {}

    /**
     * Menghitung ringkasan checkout (tanpa menyimpan). Seluruh harga dihitung ulang di server.
     *
     * @param  array{address_id:int,shops?:array,platform_voucher_code?:?string}  $input
     */
    public function quote(User $user, array $input): array
    {
        $address = Address::where('user_id', $user->id)->findOrFail($input['address_id']);
        $cartItems = $this->selectedCartItems($user);

        if ($cartItems->isEmpty()) {
            throw new DomainException('Tidak ada produk yang dipilih di keranjang.');
        }

        $shopInputs = collect($input['shops'] ?? [])->keyBy('shop_id');
        $groups = [];

        foreach ($cartItems->groupBy(fn (CartItem $i) => $i->product->shop_id) as $shopId => $items) {
            $shop = $items->first()->product->shop;
            $lines = $items->map(fn (CartItem $item) => $this->buildLine($user, $item))->values();
            $subtotal = (int) $lines->sum('subtotal');
            $weight = (int) $lines->sum('weight');
            $shopInput = $shopInputs->get($shopId, []);

            if (! $shop->origin_destination_id) {
                throw new DomainException("Toko {$shop->name} belum mengatur alamat pengiriman.");
            }

            $rates = $this->shipping->rates($shop->origin_destination_id, $address->destination_id, $weight);
            $selectedRate = null;
            if (! empty($shopInput['courier_code']) && ! empty($shopInput['courier_service'])) {
                $selectedRate = collect($rates)->first(fn ($r) => strcasecmp($r['code'], $shopInput['courier_code']) === 0
                    && strcasecmp($r['service'], $shopInput['courier_service']) === 0);
                if (! $selectedRate) {
                    throw new DomainException("Layanan pengiriman untuk toko {$shop->name} tidak tersedia.");
                }
            }

            $shopVoucher = null;
            $shopDiscount = 0;
            if (! empty($shopInput['voucher_code'])) {
                $shopVoucher = $this->resolveVoucher($user, $shopInput['voucher_code'], $shop->id);
                $shopDiscount = $shopVoucher->calculateDiscount($subtotal);
                if ($shopDiscount <= 0) {
                    throw new DomainException("Minimal belanja voucher {$shopVoucher->code} belum terpenuhi.");
                }
            }

            $groups[] = [
                'shop' => ['id' => $shop->id, 'name' => $shop->name, 'slug' => $shop->slug],
                'items' => $lines->all(),
                'subtotal' => $subtotal,
                'weight' => $weight,
                'shipping_rates' => $rates,
                'selected_rate' => $selectedRate,
                'shipping_cost' => (int) ($selectedRate['cost'] ?? 0),
                'shop_voucher' => $shopVoucher?->only(['id', 'code', 'name', 'type']),
                'shop_discount' => $shopDiscount,
                'platform_discount' => 0,
                'shipping_discount' => 0,
                'note' => $shopInput['note'] ?? null,
            ];
        }

        $platformVoucher = null;
        if (! empty($input['platform_voucher_code'])) {
            $platformVoucher = $this->resolveVoucher($user, $input['platform_voucher_code'], null);
            $this->allocatePlatformVoucher($groups, $platformVoucher);
        }

        foreach ($groups as &$group) {
            $group['total'] = $group['subtotal'] - $group['shop_discount'] - $group['platform_discount']
                + $group['shipping_cost'] - $group['shipping_discount'];
        }
        unset($group);

        $summary = [
            'subtotal' => array_sum(array_column($groups, 'subtotal')),
            'shipping_cost' => array_sum(array_column($groups, 'shipping_cost')),
            'shop_discount' => array_sum(array_column($groups, 'shop_discount')),
            'platform_discount' => array_sum(array_column($groups, 'platform_discount')),
            'shipping_discount' => array_sum(array_column($groups, 'shipping_discount')),
        ];
        $summary['total'] = array_sum(array_column($groups, 'total'));

        return [
            'address' => $address,
            'groups' => $groups,
            'platform_voucher' => $platformVoucher?->only(['id', 'code', 'name', 'type']),
            'summary' => $summary,
            'payment_gateway' => $this->payments->defaultName(),
        ];
    }

    public function checkout(User $user, array $input): Payment
    {
        $quote = $this->quote($user, $input);

        foreach ($quote['groups'] as $group) {
            if (! $group['selected_rate']) {
                throw new DomainException("Pilih jasa pengiriman untuk toko {$group['shop']['name']}.");
            }
        }

        $payment = DB::transaction(function () use ($user, $quote) {
            $this->reserveStock($user, $quote['groups']);

            $platformVoucherId = $quote['platform_voucher']['id'] ?? null;
            $payment = Payment::create([
                'user_id' => $user->id,
                'code' => $this->generateCode('PAY'),
                'gateway' => $this->payments->defaultName(),
                'amount' => $quote['summary']['total'],
                'status' => 'pending',
                'platform_voucher_id' => $platformVoucherId,
                'platform_discount' => $quote['summary']['platform_discount'] + $quote['summary']['shipping_discount'],
                'expires_at' => now()->addMinutes((int) config('marketplace.payment_expiry_minutes')),
            ]);

            foreach ($quote['groups'] as $group) {
                $rate = $group['selected_rate'];
                $order = Order::create([
                    'payment_id' => $payment->id,
                    'user_id' => $user->id,
                    'shop_id' => $group['shop']['id'],
                    'order_number' => $this->generateCode('INV'),
                    'status' => 'pending_payment',
                    'subtotal' => $group['subtotal'],
                    'shipping_cost' => $group['shipping_cost'],
                    'shipping_discount' => $group['shipping_discount'],
                    'shop_discount' => $group['shop_discount'],
                    'platform_discount' => $group['platform_discount'],
                    'total' => $group['total'],
                    'commission' => PricingService::commission($group['subtotal'] - $group['shop_discount']),
                    'shop_voucher_id' => $group['shop_voucher']['id'] ?? null,
                    'courier_code' => $rate['code'],
                    'courier_name' => $rate['name'],
                    'courier_service' => $rate['service'],
                    'etd' => $rate['etd'],
                    'total_weight' => $group['weight'],
                    'shipping_address' => $quote['address']->toSnapshot(),
                    'note' => $group['note'],
                ]);

                foreach ($group['items'] as $line) {
                    $order->items()->create([
                        'product_id' => $line['product_id'],
                        'product_variant_id' => $line['variant_id'],
                        'flash_sale_item_id' => $line['flash_sale_item_id'],
                        'product_name' => $line['name'],
                        'variant_name' => $line['variant_name'],
                        'image' => $line['image'],
                        'price' => $line['price'],
                        'original_price' => $line['original_price'],
                        'quantity' => $line['quantity'],
                        'subtotal' => $line['subtotal'],
                    ]);
                }

                if ($group['shop_voucher']) {
                    $this->consumeVoucher($group['shop_voucher']['id'], $user, $payment, $group['shop_discount']);
                }
            }

            if ($platformVoucherId) {
                $this->consumeVoucher($platformVoucherId, $user, $payment, $payment->platform_discount);
            }

            CartItem::where('user_id', $user->id)->where('is_selected', true)->delete();

            return $payment;
        });

        $payment->setRelation('user', $user);
        $payment->load('orders.shop');

        try {
            $items = $payment->orders->map(fn (Order $o) => [
                'id' => $o->order_number,
                'name' => 'Pesanan '.$o->shop->name,
                'price' => $o->total,
                'quantity' => 1,
            ])->all();

            $result = $this->payments->gateway($payment->gateway)->createTransaction($payment, $items);
            $payment->update([
                'gateway_reference' => $result['reference'],
                'snap_token' => $result['token'],
                'payment_url' => $result['url'],
                'raw_response' => $result['raw'],
            ]);
        } catch (Throwable $e) {
            $this->orders->failPayment($payment, 'failed', 'Gagal membuat transaksi pembayaran');
            throw $e;
        }

        return $payment;
    }

    /** @return Collection<int, CartItem> */
    private function selectedCartItems(User $user): Collection
    {
        return CartItem::with(['product.shop', 'product.images', 'product.activeFlashSaleItem', 'variant'])
            ->where('user_id', $user->id)
            ->where('is_selected', true)
            ->get();
    }

    private function buildLine(User $user, CartItem $item): array
    {
        $product = $item->product;

        if (! $product || $product->status !== 'active' || ! $product->shop->isActive()) {
            throw new DomainException('Produk "'.($product->name ?? '').'" sudah tidak tersedia.');
        }
        if ($product->shop->user_id === $user->id) {
            throw new DomainException('Anda tidak dapat membeli produk dari toko sendiri.');
        }

        $variant = $item->variant;
        if ($product->variants()->exists() && ! $variant) {
            throw new DomainException("Pilih variasi untuk produk {$product->name}.");
        }
        if ($variant && $variant->product_id !== $product->id) {
            throw new DomainException('Variasi produk tidak valid.');
        }

        $stock = $variant ? $variant->stock : $product->stock;
        if ($item->quantity > $stock) {
            throw new DomainException("Stok {$product->name} tidak mencukupi (tersisa {$stock}).");
        }

        $flash = $product->activeFlashSaleItem;
        if ($flash) {
            $remaining = $flash->stock - $flash->sold;
            $allowed = $flash->max_per_user - $this->pricing->flashQuantityPurchased($user, $flash);
            if ($item->quantity > min($remaining, $allowed)) {
                $flash = null;
            }
        }

        $price = $this->pricing->unitPrice($product, $variant, $flash);

        return [
            'cart_item_id' => $item->id,
            'product_id' => $product->id,
            'variant_id' => $variant?->id,
            'flash_sale_item_id' => $flash?->id,
            'name' => $product->name,
            'variant_name' => $variant?->name,
            'image' => $product->images->first()?->url,
            'price' => $price,
            'original_price' => $this->pricing->basePrice($product, $variant),
            'quantity' => $item->quantity,
            'subtotal' => $price * $item->quantity,
            'weight' => $product->weight * $item->quantity,
        ];
    }

    private function resolveVoucher(User $user, string $code, ?int $shopId): Voucher
    {
        $voucher = Voucher::available()->where('code', strtoupper(trim($code)))
            ->when($shopId, fn ($q) => $q->where('shop_id', $shopId), fn ($q) => $q->whereNull('shop_id'))
            ->first();

        if (! $voucher) {
            throw new DomainException("Voucher {$code} tidak valid atau sudah habis.");
        }

        $used = VoucherUsage::where('voucher_id', $voucher->id)->where('user_id', $user->id)->count();
        if ($used >= $voucher->per_user_limit) {
            throw new DomainException("Anda sudah mencapai batas penggunaan voucher {$voucher->code}.");
        }

        return $voucher;
    }

    private function allocatePlatformVoucher(array &$groups, Voucher $voucher): void
    {
        $isShipping = $voucher->type === 'free_shipping';
        $field = $isShipping ? 'shipping_discount' : 'platform_discount';
        $bases = array_map(fn ($g) => $isShipping ? $g['shipping_cost'] : $g['subtotal'] - $g['shop_discount'], $groups);
        $merchandise = array_sum(array_map(fn ($g) => $g['subtotal'] - $g['shop_discount'], $groups));
        $totalBase = array_sum($bases);

        if ($merchandise < $voucher->min_purchase) {
            throw new DomainException("Minimal belanja voucher {$voucher->code} adalah Rp".number_format($voucher->min_purchase, 0, ',', '.'));
        }

        $discount = $isShipping
            ? min($totalBase, $voucher->max_discount ?: $totalBase)
            : $voucher->calculateDiscount($merchandise);

        if ($discount <= 0 || $totalBase <= 0) {
            return;
        }

        $remaining = $discount;
        $last = array_key_last($groups);
        foreach ($groups as $i => &$group) {
            $share = $i === $last ? $remaining : intdiv($discount * $bases[$i], $totalBase);
            $share = min($share, $bases[$i]);
            $group[$field] = $share;
            $remaining -= $share;
        }
        unset($group);
    }

    private function reserveStock(User $user, array $groups): void
    {
        foreach ($groups as $group) {
            foreach ($group['items'] as $line) {
                if ($line['variant_id']) {
                    $affected = ProductVariant::whereKey($line['variant_id'])->where('stock', '>=', $line['quantity'])
                        ->decrement('stock', $line['quantity']);
                } else {
                    $affected = Product::whereKey($line['product_id'])->where('stock', '>=', $line['quantity'])
                        ->decrement('stock', $line['quantity']);
                }
                if (! $affected) {
                    throw new DomainException("Stok {$line['name']} baru saja habis.");
                }

                if ($line['flash_sale_item_id']) {
                    $flash = FlashSaleItem::whereKey($line['flash_sale_item_id'])->lockForUpdate()->first();
                    if (! $flash || $flash->sold + $line['quantity'] > $flash->stock
                        || $this->pricing->flashQuantityPurchased($user, $flash) + $line['quantity'] > $flash->max_per_user) {
                        throw new DomainException("Kuota flash sale {$line['name']} sudah habis.");
                    }
                    $flash->increment('sold', $line['quantity']);
                }
            }
        }
    }

    private function consumeVoucher(int $voucherId, User $user, Payment $payment, int $discount): void
    {
        $affected = Voucher::whereKey($voucherId)->whereColumn('used_count', '<', 'quota')->increment('used_count');
        if (! $affected) {
            throw new DomainException('Kuota voucher sudah habis.');
        }

        VoucherUsage::create([
            'voucher_id' => $voucherId,
            'user_id' => $user->id,
            'payment_id' => $payment->id,
            'discount' => $discount,
        ]);
    }

    private function generateCode(string $prefix): string
    {
        return $prefix.'-'.now()->format('ymd').'-'.strtoupper(Str::random(8));
    }
}
