<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Shop;
use App\Services\OrderService;
use App\Services\Shipping\ShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request)
    {
        $request->validate(['status' => ['nullable', Rule::in(Order::STATUSES)]]);

        return Order::with(['items', 'shop:id,name,slug,logo', 'payment:id,code,status,payment_url,expires_at'])
            ->where('user_id', $request->user()->id)
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(10);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOwner($request, $order);

        return response()->json($order->load(['items.review', 'shop:id,name,slug,logo', 'payment:id,code,status,gateway,method,payment_url,expires_at,paid_at']));
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOwner($request, $order);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $this->orders->cancelByBuyer($order, $data['reason']);

        return response()->json(['message' => 'Pesanan dibatalkan.']);
    }

    public function complete(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOwner($request, $order);
        $this->orders->complete($order);

        return response()->json(['message' => 'Pesanan selesai. Terima kasih!']);
    }

    public function track(Request $request, Order $order, ShippingService $shipping): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id || $order->shop->user_id === $request->user()->id, 404);

        if (! $order->tracking_number) {
            return response()->json(['message' => 'Nomor resi belum tersedia.'], 422);
        }

        return response()->json($shipping->track($order->tracking_number, $order->courier_code));
    }

    public function review(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOwner($request, $order);
        abort_unless($order->status === 'completed', 422, 'Ulasan hanya untuk pesanan yang sudah selesai.');

        $data = $request->validate([
            'order_item_id' => ['required', 'integer'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $item = $order->items()->whereKey($data['order_item_id'])->firstOrFail();
        abort_if($item->is_reviewed || ! $item->product_id, 422, 'Produk ini sudah diulas.');

        DB::transaction(function () use ($request, $order, $item, $data) {
            Review::create([
                'order_item_id' => $item->id,
                'product_id' => $item->product_id,
                'shop_id' => $order->shop_id,
                'user_id' => $request->user()->id,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
            ]);
            $item->update(['is_reviewed' => true]);

            $productStats = Review::where('product_id', $item->product_id)->selectRaw('AVG(rating) avg, COUNT(*) cnt')->first();
            Product::withTrashed()->whereKey($item->product_id)->update(['rating_avg' => round((float) $productStats->avg, 2), 'rating_count' => $productStats->cnt]);

            $shopStats = Review::where('shop_id', $order->shop_id)->selectRaw('AVG(rating) avg, COUNT(*) cnt')->first();
            Shop::whereKey($order->shop_id)->update(['rating_avg' => round((float) $shopStats->avg, 2), 'rating_count' => $shopStats->cnt]);
        });

        return response()->json(['message' => 'Terima kasih atas ulasannya!'], 201);
    }

    private function authorizeOwner(Request $request, Order $order): void
    {
        abort_unless($order->user_id === $request->user()->id, 404);
    }
}
