<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FlashSaleController extends Controller
{
    public function index()
    {
        return FlashSale::withCount(['items', 'items as pending_count' => fn ($q) => $q->where('status', 'pending')])
            ->latest('starts_at')->paginate(20);
    }

    public function show(FlashSale $flashSale): JsonResponse
    {
        return response()->json($flashSale->load(['items.product:id,name,price,stock,shop_id', 'items.product.shop:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(FlashSale::create($this->validated($request)), 201);
    }

    public function update(Request $request, FlashSale $flashSale): JsonResponse
    {
        $flashSale->update($this->validated($request));

        return response()->json($flashSale);
    }

    public function destroy(FlashSale $flashSale): JsonResponse
    {
        abort_if($flashSale->items()->where('sold', '>', 0)->exists(), 422, 'Flash sale sudah memiliki transaksi.');
        $flashSale->delete();

        return response()->json(['message' => 'Flash sale dihapus.']);
    }

    public function reviewItem(Request $request, FlashSaleItem $item): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:approved,rejected']]);
        $item->forceFill($data)->save();

        return response()->json($item);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
