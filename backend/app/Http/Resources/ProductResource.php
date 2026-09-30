<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $flash = $this->relationLoaded('activeFlashSaleItem') ? $this->activeFlashSaleItem : null;
        $variants = $this->relationLoaded('variants') ? $this->variants : collect();
        $minPrice = $variants->isNotEmpty() ? (int) $variants->min('price') : $this->price;
        $maxPrice = $variants->isNotEmpty() ? (int) $variants->max('price') : $this->price;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->when($request->routeIs('products.show', 'seller.products.show'), $this->description),
            'price' => $this->price,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'final_price' => $flash ? min($minPrice, $flash->flash_price) : $minPrice,
            'stock' => $variants->isNotEmpty() ? (int) $variants->sum('stock') : $this->stock,
            'weight' => $this->weight,
            'condition' => $this->condition,
            'status' => $this->status,
            'ban_reason' => $this->when($this->status === 'banned', $this->ban_reason),
            'sold_count' => $this->sold_count,
            'rating_avg' => $this->rating_avg,
            'rating_count' => $this->rating_count,
            'category_id' => $this->category_id,
            'image' => $this->relationLoaded('images') ? $this->images->first()?->url : null,
            'images' => $this->whenLoaded('images', fn () => $this->images->map->only(['id', 'url'])),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map->only(['id', 'name', 'sku', 'price', 'stock'])),
            'category' => $this->whenLoaded('category', fn () => $this->category?->only(['id', 'name', 'slug'])),
            'shop' => $this->whenLoaded('shop', fn () => $this->shop->only(['id', 'name', 'slug', 'logo', 'origin_label', 'is_official', 'rating_avg'])),
            'flash_sale' => $flash ? [
                'id' => $flash->id,
                'flash_price' => $flash->flash_price,
                'stock' => $flash->stock,
                'sold' => $flash->sold,
                'max_per_user' => $flash->max_per_user,
                'ends_at' => $flash->relationLoaded('flashSale') ? $flash->flashSale->ends_at : null,
            ] : null,
            'is_ad' => (bool) ($this->is_ad ?? false),
            'ad_id' => $this->ad_id ?? null,
            'created_at' => $this->created_at,
        ];
    }
}
