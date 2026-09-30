<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderItem extends Model
{
    protected $fillable = [
        'product_id', 'product_variant_id', 'flash_sale_item_id', 'product_name', 'variant_name', 'image',
        'price', 'original_price', 'quantity', 'subtotal', 'is_reviewed',
    ];

    protected function casts(): array
    {
        return ['is_reviewed' => 'boolean', 'price' => 'integer', 'original_price' => 'integer', 'subtotal' => 'integer'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }
}
