<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly PricingService $pricing) {}

    public function index(Request $request): JsonResponse
    {
        $items = CartItem::with(['product' => fn ($q) => $q->withTrashed()->with(['images', 'variants', 'shop', 'activeFlashSaleItem.flashSale']), 'variant'])
            ->where('user_id', $request->user()->id)->latest()->get();

        $groups = $items->groupBy(fn ($i) => $i->product->shop_id)->map(function ($items) {
            $shop = $items->first()->product->shop;

            return [
                'shop' => $shop->only(['id', 'name', 'slug', 'logo']),
                'items' => $items->map(function (CartItem $item) {
                    $product = $item->product;
                    $available = ! $product->trashed() && $product->status === 'active' && $product->shop->isActive();
                    $stock = $item->variant ? $item->variant->stock : $product->stock;

                    return [
                        'id' => $item->id,
                        'quantity' => $item->quantity,
                        'is_selected' => $item->is_selected,
                        'is_available' => $available && $stock > 0,
                        'stock' => $stock,
                        'unit_price' => $this->pricing->unitPrice($product, $item->variant, $product->activeFlashSaleItem),
                        'original_price' => $this->pricing->basePrice($product, $item->variant),
                        'variant' => $item->variant?->only(['id', 'name']),
                        'product' => (new ProductResource($product))->resolve(),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json(['groups' => $groups, 'count' => $items->sum('quantity')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer'],
            'quantity' => ['required', 'integer', 'between:1,999'],
            'buy_now' => ['sometimes', 'boolean'],
        ]);

        $product = Product::visible()->with('variants', 'shop')->findOrFail($data['product_id']);
        if ($product->shop->user_id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa membeli produk sendiri.'], 422);
        }

        $variant = null;
        if ($product->variants->isNotEmpty()) {
            $variant = $product->variants->firstWhere('id', $data['product_variant_id'] ?? null);
            if (! $variant) {
                return response()->json(['message' => 'Silakan pilih variasi.'], 422);
            }
        }

        $item = CartItem::firstOrNew([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant?->id,
        ]);
        $quantity = ($data['buy_now'] ?? false) ? $data['quantity'] : $item->quantity + $data['quantity'];
        $stock = $variant ? $variant->stock : $product->stock;

        if ($quantity > $stock) {
            return response()->json(['message' => "Stok tidak mencukupi (tersisa {$stock})."], 422);
        }

        if ($data['buy_now'] ?? false) {
            CartItem::where('user_id', $request->user()->id)->update(['is_selected' => false]);
        }

        $item->quantity = $quantity;
        $item->is_selected = true;
        $item->save();

        return response()->json(['message' => 'Produk ditambahkan ke keranjang.', 'id' => $item->id], 201);
    }

    public function update(Request $request, CartItem $cartItem): JsonResponse
    {
        abort_unless($cartItem->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'quantity' => ['sometimes', 'integer', 'between:1,999'],
            'is_selected' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['quantity'])) {
            $cartItem->load('product', 'variant');
            $stock = $cartItem->variant ? $cartItem->variant->stock : $cartItem->product->stock;
            if ($data['quantity'] > $stock) {
                return response()->json(['message' => "Stok tidak mencukupi (tersisa {$stock})."], 422);
            }
        }

        $cartItem->update($data);

        return response()->json(['message' => 'Keranjang diperbarui.']);
    }

    public function selectAll(Request $request): JsonResponse
    {
        $data = $request->validate([
            'is_selected' => ['required', 'boolean'],
            'shop_id' => ['nullable', 'integer'],
        ]);

        CartItem::where('user_id', $request->user()->id)
            ->when($data['shop_id'] ?? null, fn ($q, $shopId) => $q->whereHas('product', fn ($p) => $p->where('shop_id', $shopId)))
            ->update(['is_selected' => $data['is_selected']]);

        return response()->json(['message' => 'Keranjang diperbarui.']);
    }

    public function destroy(Request $request, CartItem $cartItem): JsonResponse
    {
        abort_unless($cartItem->user_id === $request->user()->id, 404);
        $cartItem->delete();

        return response()->json(['message' => 'Produk dihapus dari keranjang.']);
    }
}
