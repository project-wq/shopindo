<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FlashSaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $shopId = $request->user()->shop->id;

        $sessions = FlashSale::where('is_active', true)->where('ends_at', '>', now())->orderBy('starts_at')
            ->with(['items' => fn ($q) => $q->whereHas('product', fn ($p) => $p->where('shop_id', $shopId))->with('product:id,name,price,stock')])
            ->get();

        return response()->json($sessions);
    }

    public function register(Request $request, FlashSale $flashSale): JsonResponse
    {
        abort_unless($flashSale->is_active && $flashSale->starts_at->isFuture(), 422, 'Pendaftaran sesi flash sale ini sudah ditutup.');

        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'flash_price' => ['required', 'integer', 'min:100'],
            'stock' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_per_user' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $product = $request->user()->shop->products()->where('status', 'active')->findOrFail($data['product_id']);
        abort_if($data['flash_price'] >= $product->price, 422, 'Harga flash sale harus lebih rendah dari harga normal.');
        abort_if($data['stock'] > $product->stock, 422, 'Stok flash sale melebihi stok produk.');

        $item = $flashSale->items()->updateOrCreate(
            ['product_id' => $product->id],
            collect($data)->only(['flash_price', 'stock', 'max_per_user'])->all(),
        );
        $item->forceFill(['status' => 'pending'])->save();

        return response()->json($item, 201);
    }

    public function withdraw(Request $request, FlashSaleItem $item): JsonResponse
    {
        $item->load('product', 'flashSale');
        abort_unless($item->product->shop_id === $request->user()->shop->id, 404);
        abort_unless($item->flashSale->starts_at->isFuture(), 422, 'Flash sale sudah berjalan.');
        $item->delete();

        return response()->json(['message' => 'Produk ditarik dari flash sale.']);
    }
}
