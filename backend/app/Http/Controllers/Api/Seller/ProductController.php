<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\Upload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        return ProductResource::collection(
            $request->user()->shop->products()->with(['images', 'variants', 'category'])
                ->when($request->input('q'), fn ($q, $term) => $q->where('name', 'like', '%'.addcslashes($term, '%_\\').'%'))
                ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
                ->latest()->paginate(20)
        );
    }

    public function show(Request $request, Product $product): ProductResource
    {
        $this->authorizeProduct($request, $product);

        return new ProductResource($product->load(['images', 'variants', 'category']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, true);
        $shop = $request->user()->shop;

        $product = DB::transaction(function () use ($request, $shop, $data) {
            $product = $shop->products()->create([
                ...collect($data)->only(['category_id', 'name', 'description', 'price', 'stock', 'weight', 'condition'])->all(),
                'status' => $data['status'] ?? 'active',
                'slug' => Str::slug(Str::limit($data['name'], 80, '')).'-'.Str::lower(Str::random(6)),
            ]);
            $this->syncImages($request, $product);
            $this->syncVariants($product, $data['variants'] ?? []);

            return $product;
        });

        return (new ProductResource($product->load(['images', 'variants', 'category'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, Product $product): ProductResource
    {
        $this->authorizeProduct($request, $product);
        abort_if($product->status === 'banned', 422, 'Produk diblokir admin: '.$product->ban_reason);
        $data = $this->validated($request, false);

        DB::transaction(function () use ($request, $product, $data) {
            $product->update(collect($data)->only(['category_id', 'name', 'description', 'price', 'stock', 'weight', 'condition', 'status'])->all());
            $this->syncImages($request, $product, $data['keep_image_ids'] ?? null);
            if (array_key_exists('variants', $data)) {
                $this->syncVariants($product, $data['variants'] ?? []);
            }
        });

        return new ProductResource($product->load(['images', 'variants', 'category']));
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);
        $product->delete();

        return response()->json(['message' => 'Produk dihapus.']);
    }

    private function validated(Request $request, bool $creating): array
    {
        return $request->validate([
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'min:5', 'max:200'],
            'description' => ['required', 'string', 'min:20', 'max:5000'],
            'price' => ['required', 'integer', 'min:100', 'max:1000000000'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'weight' => ['required', 'integer', 'min:1', 'max:50000'],
            'condition' => ['required', 'in:new,used'],
            'status' => ['sometimes', 'in:active,inactive'],
            'images' => [$creating ? 'required_without:image_urls' : 'nullable', 'array', 'max:9'],
            'images.*' => Upload::IMAGE_RULE,
            'image_urls' => ['nullable', 'array', 'max:9'],
            'image_urls.*' => ['url:https', 'max:500'],
            'keep_image_ids' => ['nullable', 'array'],
            'keep_image_ids.*' => ['integer'],
            'variants' => ['nullable', 'array', 'max:50'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['required', 'string', 'max:100'],
            'variants.*.sku' => ['nullable', 'string', 'max:64'],
            'variants.*.price' => ['required', 'integer', 'min:100', 'max:1000000000'],
            'variants.*.stock' => ['required', 'integer', 'min:0', 'max:1000000'],
        ]);
    }

    private function syncImages(Request $request, Product $product, ?array $keepIds = null): void
    {
        if ($keepIds !== null) {
            $product->images()->whereNotIn('id', $keepIds)->delete();
        }

        $order = (int) $product->images()->max('sort_order');
        foreach ($request->file('images', []) as $file) {
            $product->images()->create(['url' => Upload::image($file, 'products'), 'sort_order' => ++$order]);
        }
        foreach ($request->input('image_urls', []) as $url) {
            $product->images()->create(['url' => $url, 'sort_order' => ++$order]);
        }
    }

    private function syncVariants(Product $product, array $variants): void
    {
        $keep = [];
        foreach ($variants as $v) {
            $variant = ! empty($v['id']) ? $product->variants()->find($v['id']) : null;
            $attrs = collect($v)->only(['name', 'sku', 'price', 'stock'])->all();
            $variant ? $variant->update($attrs) : $variant = $product->variants()->create($attrs);
            $keep[] = $variant->id;
        }
        $product->variants()->whereNotIn('id', $keep)->delete();

        if ($keep) {
            $product->update([
                'price' => (int) $product->variants()->min('price'),
                'stock' => (int) $product->variants()->sum('stock'),
            ]);
        }
    }

    private function authorizeProduct(Request $request, Product $product): void
    {
        abort_unless($product->shop_id === $request->user()->shop->id, 404);
    }
}
