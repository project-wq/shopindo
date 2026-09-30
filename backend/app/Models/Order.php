<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];

    protected $fillable = [
        'payment_id', 'user_id', 'shop_id', 'order_number', 'status', 'subtotal', 'shipping_cost',
        'shipping_discount', 'shop_discount', 'platform_discount', 'total', 'commission', 'shop_voucher_id',
        'courier_code', 'courier_name', 'courier_service', 'etd', 'tracking_number', 'total_weight',
        'shipping_address', 'note', 'cancel_reason', 'paid_at', 'shipped_at', 'delivered_at',
        'completed_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_address' => 'array',
            'subtotal' => 'integer',
            'shipping_cost' => 'integer',
            'shipping_discount' => 'integer',
            'shop_discount' => 'integer',
            'platform_discount' => 'integer',
            'total' => 'integer',
            'commission' => 'integer',
            'paid_at' => 'datetime',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function sellerIncome(): int
    {
        return $this->subtotal - $this->shop_discount - $this->commission + $this->shipping_cost;
    }
}
