<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Banner;
use App\Models\Category;
use App\Models\FlashSale;
use App\Models\Product;
use App\Models\ProductAd;
use App\Models\Review;
use App\Models\Shop;
use App\Models\Voucher;
use App\Services\Shipping\ShippingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    private const PRODUCT_LIST_RELATIONS = ['images', 'variants', 'shop', 'activeFlashSaleItem.flashSale'];

    public function home(): JsonResponse
    {
        $data = Cache::remember('home:static', now()->addMinutes(5), fn () => [
            'banners' => Banner::where('is_active', true)->orderBy('sort_order')->get(['id', 'title', 'image', 'link'])->toArray(),
            'categories' => Category::where('is_active', true)->whereNull('parent_id')->orderBy('sort_order')->get(['id', 'name', 'slug', 'icon'])->toArray(),
        ]);

        $flashSale = FlashSale::running()->with(['items' => fn ($q) => $q->where('status', 'approved')
            ->whereHas('product', fn ($p) => $p->visible())
            ->with(['product' => fn ($p) => $p->with(self::PRODUCT_LIST_RELATIONS)])->limit(12)])
            ->orderBy('ends_at')->first();

        return response()->json([
            ...$data,
            'flash_sale' => $flashSale ? [
                'id' => $flashSale->id,
                'name' => $flashSale->name,
                'starts_at' => $flashSale->starts_at,
                'ends_at' => $flashSale->ends_at,
                'products' => ProductResource::collection($flashSale->items->pluck('product')),
            ] : null,
            'recommended' => ProductResource::collection(
                Product::visible()->with(self::PRODUCT_LIST_RELATIONS)
                    ->orderByDesc('sold_count')->orderByDesc('rating_avg')->limit(24)->get()
            ),
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(Category::where('is_active', true)->whereNull('parent_id')
            ->with(['children' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('sort_order')->get());
    }

    public function products(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'shop' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'condition' => ['nullable', 'in:new,used'],
            'sort' => ['nullable', 'in:relevance,latest,sales,price_asc,price_desc,rating'],
            'per_page' => ['nullable', 'integer', 'between:1,60'],
        ]);

        $query = Product::visible()->with(self::PRODUCT_LIST_RELATIONS);

        if (! empty($filters['q'])) {
            $term = '%'.addcslashes($filters['q'], '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('name', 'like', $term)->orWhere('description', 'like', $term));
        }
        if (! empty($filters['category'])) {
            $category = Category::where('slug', $filters['category'])->first();
            $ids = $category ? $category->children()->pluck('id')->push($category->id) : collect([0]);
            $query->whereIn('category_id', $ids);
        }
        if (! empty($filters['shop'])) {
            $query->whereHas('shop', fn (Builder $q) => $q->where('slug', $filters['shop']));
        }
        if (isset($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }
        if (isset($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }
        if (! empty($filters['rating'])) {
            $query->where('rating_avg', '>=', $filters['rating']);
        }
        if (! empty($filters['condition'])) {
            $query->where('condition', $filters['condition']);
        }

        match ($filters['sort'] ?? 'relevance') {
            'latest' => $query->latest(),
            'sales' => $query->orderByDesc('sold_count'),
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'rating' => $query->orderByDesc('rating_avg'),
            default => $query->orderByDesc('sold_count')->orderByDesc('id'),
        };

        $page = $query->paginate($filters['per_page'] ?? 30)->withQueryString();

        $ads = $request->integer('page', 1) === 1 && empty($filters['shop']) ? $this->sponsoredProducts($filters['q'] ?? null) : collect();

        return ProductResource::collection($page)->additional(['sponsored' => ProductResource::collection($ads)]);
    }

    public function product(string $slug): ProductResource
    {
        $product = Product::visible()->where('slug', $slug)
            ->with(['images', 'variants', 'category', 'shop', 'activeFlashSaleItem.flashSale'])
            ->firstOrFail();

        Product::whereKey($product->id)->increment('view_count');

        return new ProductResource($product);
    }

    public function relatedProducts(string $slug)
    {
        $product = Product::visible()->where('slug', $slug)->firstOrFail();

        return ProductResource::collection(Product::visible()->with(self::PRODUCT_LIST_RELATIONS)
            ->where('category_id', $product->category_id)->whereKeyNot($product->id)
            ->orderByDesc('sold_count')->limit(12)->get());
    }

    public function productReviews(Request $request, string $slug)
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        return Review::with(['user:id,name,avatar', 'orderItem:id,variant_name'])
            ->where('product_id', $product->id)
            ->when($request->integer('rating'), fn ($q, $r) => $q->where('rating', $r))
            ->latest()->paginate(10);
    }

    public function shop(Request $request, string $slug): JsonResponse
    {
        $shop = Shop::where('slug', $slug)->where('status', 'active')->withCount(['products' => fn ($q) => $q->where('status', 'active'), 'followers'])->firstOrFail();

        return response()->json([
            ...$shop->only(['id', 'name', 'slug', 'description', 'logo', 'banner', 'origin_label', 'is_official', 'rating_avg', 'rating_count', 'products_count', 'followers_count', 'created_at']),
            'is_following' => $request->user('sanctum') ? $shop->followers()->whereKey($request->user('sanctum')->id)->exists() : false,
            'vouchers' => Voucher::available()->where('shop_id', $shop->id)->get(['id', 'code', 'name', 'type', 'value', 'max_discount', 'min_purchase', 'ends_at']),
        ]);
    }

    public function flashSales(): JsonResponse
    {
        $sessions = FlashSale::where('is_active', true)->where('ends_at', '>', now())
            ->orderBy('starts_at')->limit(5)
            ->with(['items' => fn ($q) => $q->where('status', 'approved')->whereHas('product', fn ($p) => $p->visible())
                ->with(['product' => fn ($p) => $p->with(['images', 'variants', 'shop'])])])
            ->get();

        return response()->json($sessions->map(fn (FlashSale $fs) => [
            'id' => $fs->id,
            'name' => $fs->name,
            'starts_at' => $fs->starts_at,
            'ends_at' => $fs->ends_at,
            'is_running' => $fs->starts_at->isPast(),
            'items' => $fs->items->map(fn ($item) => [
                'id' => $item->id,
                'flash_price' => $item->flash_price,
                'stock' => $item->stock,
                'sold' => $item->sold,
                'product' => (new ProductResource($item->product))->resolve(),
            ]),
        ]));
    }

    public function platformVouchers(): JsonResponse
    {
        return response()->json(Voucher::available()->whereNull('shop_id')->orderByDesc('value')
            ->get(['id', 'code', 'name', 'type', 'value', 'max_discount', 'min_purchase', 'quota', 'used_count', 'ends_at']));
    }

    public function destinations(Request $request, ShippingService $shipping): JsonResponse
    {
        $data = $request->validate(['search' => ['required', 'string', 'min:3', 'max:60']]);

        return response()->json($shipping->searchDestination($data['search']));
    }

    public function trackAdClick(ProductAd $ad): JsonResponse
    {
        DB::transaction(function () use ($ad) {
            $ad = ProductAd::whereKey($ad->id)->lockForUpdate()->with('shop')->first();
            if (! $ad || $ad->status !== 'active') {
                return;
            }
            $spentToday = $ad->spentToday();
            if ($spentToday + $ad->cost_per_click > $ad->daily_budget || $ad->shop->balance < $ad->cost_per_click) {
                return;
            }
            $ad->forceFill([
                'clicks' => $ad->clicks + 1,
                'spent_today' => $spentToday + $ad->cost_per_click,
                'spent_date' => today(),
                'total_spent' => $ad->total_spent + $ad->cost_per_click,
            ])->save();
            $ad->shop->debit($ad->cost_per_click, 'Biaya iklan (klik) produk #'.$ad->product_id, $ad);
        });

        return response()->json(['ok' => true]);
    }

    private function sponsoredProducts(?string $keyword)
    {
        $ads = ProductAd::where('status', 'active')
            ->whereHas('product', fn ($q) => $q->visible())
            ->whereHas('shop', fn ($q) => $q->whereColumn('balance', '>=', 'product_ads.cost_per_click'))
            ->where(fn ($q) => $q->whereNull('spent_date')->orWhere('spent_date', '<', today())
                ->orWhereColumn('spent_today', '<', DB::raw('daily_budget - cost_per_click + 1')))
            ->when($keyword, fn ($q) => $q->where(fn ($w) => $w->whereNull('keyword')
                ->orWhere('keyword', 'like', '%'.addcslashes($keyword, '%_\\').'%')))
            ->with(['product' => fn ($q) => $q->with(self::PRODUCT_LIST_RELATIONS)])
            ->orderByDesc('cost_per_click')->limit(4)->get();

        ProductAd::whereIn('id', $ads->pluck('id'))->increment('impressions');

        return $ads->map(function (ProductAd $ad) {
            $product = $ad->product;
            $product->setAttribute('is_ad', true);
            $product->setAttribute('ad_id', $ad->id);

            return $product;
        });
    }
}
