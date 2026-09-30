<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Shop;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\Upload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShopController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->shop()->exists(), 422, 'Anda sudah memiliki toko.');
        abort_if($user->isAdmin(), 422, 'Admin tidak dapat membuka toko.');

        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:100', 'unique:shops,name'],
            'description' => ['nullable', 'string', 'max:2000'],
            'phone' => ['required', 'string', 'regex:/^(\+62|62|0)8[0-9]{7,12}$/'],
            'origin_destination_id' => ['required', 'integer', 'min:1'],
            'origin_label' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
        ]);

        $shop = DB::transaction(function () use ($user, $data) {
            $shop = $user->shop()->create($data + ['slug' => $this->uniqueSlug($data['name'])]);
            $user->forceFill(['role' => User::ROLE_SELLER])->save();

            return $shop;
        });

        User::where('role', User::ROLE_ADMIN)->pluck('id')->each(fn ($id) => UserNotification::send(
            $id, 'shop', 'Pendaftaran toko baru', "Toko {$shop->name} menunggu verifikasi.", ['shop_id' => $shop->id]
        ));

        return response()->json($shop, 201);
    }

    public function show(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        abort_unless($shop, 404, 'Anda belum memiliki toko.');

        return response()->json($shop->makeVisible('balance'));
    }

    public function update(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        abort_unless($shop, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:100', 'unique:shops,name,'.$shop->id],
            'description' => ['nullable', 'string', 'max:2000'],
            'phone' => ['required', 'string', 'regex:/^(\+62|62|0)8[0-9]{7,12}$/'],
            'origin_destination_id' => ['required', 'integer', 'min:1'],
            'origin_label' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'logo' => ['nullable', ...Upload::IMAGE_RULE],
            'banner' => ['nullable', ...Upload::IMAGE_RULE],
        ]);

        foreach (['logo', 'banner'] as $field) {
            if ($request->hasFile($field)) {
                $data[$field] = Upload::image($request->file($field), 'shops');
            } else {
                unset($data[$field]);
            }
        }

        if ($data['name'] !== $shop->name) {
            $data['slug'] = $this->uniqueSlug($data['name']);
        }

        $shop->update($data);

        return response()->json($shop->makeVisible('balance'));
    }

    public function dashboard(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        $orders = Order::where('shop_id', $shop->id);

        $statusCounts = (clone $orders)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        $sales = (clone $orders)->where('status', 'completed')->where('completed_at', '>=', now()->subDays(29)->startOfDay())
            ->get(['completed_at', 'subtotal', 'shop_discount'])
            ->groupBy(fn ($o) => $o->completed_at->toDateString())
            ->map(fn ($g) => $g->sum(fn ($o) => $o->subtotal - $o->shop_discount));

        $chart = collect(range(29, 0))->map(fn ($d) => now()->subDays($d)->toDateString())
            ->map(fn ($date) => ['date' => $date, 'total' => (int) ($sales[$date] ?? 0)]);

        return response()->json([
            'balance' => $shop->balance,
            'status_counts' => $statusCounts,
            'total_products' => $shop->products()->count(),
            'total_revenue' => (int) (clone $orders)->where('status', 'completed')->sum(DB::raw('subtotal - shop_discount')),
            'rating_avg' => $shop->rating_avg,
            'followers' => $shop->followers()->count(),
            'sales_chart' => $chart,
            'top_products' => $shop->products()->orderByDesc('sold_count')->limit(5)->get(['id', 'name', 'slug', 'sold_count', 'stock', 'price']),
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'toko';
        $slug = $base;
        $i = 1;
        while (Shop::where('slug', $slug)->exists()) {
            $slug = $base.'-'.++$i;
        }

        return $slug;
    }
}
