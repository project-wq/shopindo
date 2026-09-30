<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAd extends Model
{
    protected $fillable = ['product_id', 'keyword', 'daily_budget', 'cost_per_click', 'status'];

    protected function casts(): array
    {
        return ['daily_budget' => 'integer', 'cost_per_click' => 'integer', 'spent_date' => 'date'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function spentToday(): int
    {
        return $this->spent_date?->isToday() ? $this->spent_today : 0;
    }
}
