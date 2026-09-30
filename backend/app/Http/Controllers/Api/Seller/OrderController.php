<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request)
    {
        $request->validate(['status' => ['nullable', Rule::in(Order::STATUSES)]]);

        return Order::with(['items', 'user:id,name'])
            ->where('shop_id', $request->user()->shop->id)
            ->where('status', '!=', 'pending_payment')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $term) => $q->where('order_number', 'like', '%'.addcslashes($term, '%_\\').'%'))
            ->latest()->paginate(15);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);

        return response()->json([...$order->load(['items', 'user:id,name,email,phone'])->toArray(), 'seller_income' => $order->sellerIncome()]);
    }

    public function process(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $this->orders->process($order);

        return response()->json(['message' => 'Pesanan sedang dikemas.']);
    }

    public function ship(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate(['tracking_number' => ['required', 'string', 'alpha_num:ascii', 'min:6', 'max:40']]);

        $this->orders->ship($order, strtoupper($data['tracking_number']));

        return response()->json(['message' => 'Pesanan ditandai dikirim.']);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $this->orders->cancelBySeller($order, $data['reason']);

        return response()->json(['message' => 'Pesanan dibatalkan.']);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless($order->shop_id === $request->user()->shop->id && $order->status !== 'pending_payment', 404);
    }
}
