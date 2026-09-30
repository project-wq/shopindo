<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'name', 'type', 'value', 'max_discount', 'min_purchase', 'quota',
        'per_user_limit', 'starts_at', 'ends_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'max_discount' => 'integer',
            'min_purchase' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function usages(): HasMany
    {
        return $this->hasMany(VoucherUsage::class);
    }

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->whereColumn('used_count', '<', 'quota');
    }

    public function calculateDiscount(int $subtotal, int $shippingCost = 0): int
    {
        if ($subtotal < $this->min_purchase) {
            return 0;
        }

        $discount = match ($this->type) {
            'fixed' => $this->value,
            'percentage' => intdiv($subtotal * min($this->value, 100), 100),
            'free_shipping' => $shippingCost,
        };

        if ($this->max_discount) {
            $discount = min($discount, $this->max_discount);
        }

        return (int) min($discount, $this->type === 'free_shipping' ? $shippingCost : $subtotal);
    }
}
