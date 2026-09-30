<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        return ProductResource::collection(Product::with(['images', 'shop', 'category'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $t) => $q->where('name', 'like', '%'.addcslashes($t, '%_\\').'%'))
            ->latest()->paginate(20));
    }

    public function ban(Request $request, Product $product): ProductResource
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $product->forceFill(['status' => 'banned', 'ban_reason' => $data['reason']])->save();

        UserNotification::send($product->shop->user_id, 'product', 'Produk diblokir',
            "Produk {$product->name} diblokir admin: {$data['reason']}", ['product_id' => $product->id]);

        return new ProductResource($product);
    }

    public function unban(Product $product): ProductResource
    {
        $product->forceFill(['status' => 'active', 'ban_reason' => null])->save();

        return new ProductResource($product);
    }
}
