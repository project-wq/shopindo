<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\ProductAd;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(ProductAd::with('product:id,name,slug')->where('shop_id', $request->user()->shop->id)->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $shop = $request->user()->shop;
        $shop->products()->where('status', 'active')->findOrFail($data['product_id']);

        $ad = ProductAd::where('shop_id', $shop->id)->where('product_id', $data['product_id'])->first();
        abort_if($ad, 422, 'Produk ini sudah memiliki iklan.');

        $ad = new ProductAd($data);
        $ad->shop_id = $shop->id;
        $ad->save();

        return response()->json($ad, 201);
    }

    public function update(Request $request, ProductAd $ad): JsonResponse
    {
        abort_unless($ad->shop_id === $request->user()->shop->id, 404);
        $data = $request->validate([
            'keyword' => ['nullable', 'string', 'max:100'],
            'daily_budget' => ['required', 'integer', 'min:5000'],
            'cost_per_click' => ['required', 'integer', 'min:100', 'lte:daily_budget'],
            'status' => ['required', 'in:active,paused'],
        ]);
        $ad->update($data);

        return response()->json($ad);
    }

    public function destroy(Request $request, ProductAd $ad): JsonResponse
    {
        abort_unless($ad->shop_id === $request->user()->shop->id, 404);
        $ad->delete();

        return response()->json(['message' => 'Iklan dihapus.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'product_id' => ['required', 'integer'],
            'keyword' => ['nullable', 'string', 'max:100'],
            'daily_budget' => ['required', 'integer', 'min:5000'],
            'cost_per_click' => ['required', 'integer', 'min:100', 'lte:daily_budget'],
        ]);
    }
}
