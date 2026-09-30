<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $ids = $request->user()->wishlists()->latest()->pluck('product_id');

        return ProductResource::collection(Product::visible()->whereIn('id', $ids)
            ->with(['images', 'variants', 'shop', 'activeFlashSaleItem.flashSale'])->get());
    }

    public function toggle(Request $request, Product $product): JsonResponse
    {
        $existing = $request->user()->wishlists()->where('product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['wishlisted' => false]);
        }

        $request->user()->wishlists()->create(['product_id' => $product->id]);

        return response()->json(['wishlisted' => true]);
    }

    public function status(Request $request, Product $product): JsonResponse
    {
        return response()->json(['wishlisted' => $request->user()->wishlists()->where('product_id', $product->id)->exists()]);
    }

    public function toggleFollow(Request $request, Shop $shop): JsonResponse
    {
        $result = $shop->followers()->toggle($request->user()->id);

        return response()->json(['following' => ! empty($result['attached'])]);
    }
}
