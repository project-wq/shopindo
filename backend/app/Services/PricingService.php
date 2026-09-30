<?php

namespace App\Services;

use App\Models\FlashSaleItem;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

class PricingService
{
    public function basePrice(Product $product, ?ProductVariant $variant = null): int
    {
        return $variant?->price ?? $product->price;
    }

    public function unitPrice(Product $product, ?ProductVariant $variant = null, ?FlashSaleItem $flash = null): int
    {
        $base = $this->basePrice($product, $variant);

        return $flash ? min($base, $flash->flash_price) : $base;
    }

    public function flashQuantityPurchased(User $user, FlashSaleItem $flash): int
    {
        return (int) OrderItem::where('flash_sale_item_id', $flash->id)
            ->whereHas('order', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'cancelled'))
            ->sum('quantity');
    }

    public static function commission(int $amount): int
    {
        return (int) round($amount * (float) config('marketplace.commission_percent') / 100);
    }
}
