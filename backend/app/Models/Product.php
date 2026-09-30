<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 'price', 'stock', 'weight', 'condition', 'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'stock' => 'integer',
            'weight' => 'integer',
            'rating_avg' => 'float',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function flashSaleItems(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class);
    }

    public function activeFlashSaleItem(): HasOne
    {
        return $this->hasOne(FlashSaleItem::class)
            ->where('status', 'approved')
            ->whereColumn('sold', '<', 'stock')
            ->whereHas('flashSale', fn (Builder $q) => $q->running());
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->whereHas('shop', fn (Builder $q) => $q->where('status', 'active'));
    }

    public function totalStock(): int
    {
        return $this->variants->isNotEmpty() ? (int) $this->variants->sum('stock') : $this->stock;
    }
}
