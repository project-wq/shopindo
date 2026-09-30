<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        return Shop::with('owner:id,name,email')->withCount('products')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $t) => $q->where('name', 'like', '%'.addcslashes($t, '%_\\').'%'))
            ->latest()->paginate(20)
            ->through(fn (Shop $shop) => $shop->makeVisible('balance'));
    }

    public function updateStatus(Request $request, Shop $shop): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'is_official' => ['sometimes', 'boolean'],
        ]);

        $shop->forceFill($data)->save();

        UserNotification::send($shop->user_id, 'shop', $data['status'] === 'active' ? 'Toko diaktifkan' : 'Toko ditangguhkan',
            $data['status'] === 'active' ? "Selamat! Toko {$shop->name} sudah aktif dan siap berjualan." : "Toko {$shop->name} ditangguhkan oleh admin.");

        return response()->json($shop);
    }
}
