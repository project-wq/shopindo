<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlashSaleItem extends Model
{
    protected $fillable = ['product_id', 'flash_price', 'stock', 'max_per_user'];

    protected function casts(): array
    {
        return ['flash_price' => 'integer', 'stock' => 'integer', 'sold' => 'integer', 'max_per_user' => 'integer'];
    }

    public function flashSale(): BelongsTo
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
