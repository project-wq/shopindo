<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\CheckoutService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(private readonly CheckoutService $checkout) {}

    public function quote(Request $request): JsonResponse
    {
        return response()->json($this->checkout->quote($request->user(), $this->validated($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $payment = $this->checkout->checkout($request->user(), $this->validated($request));

        return response()->json([
            'payment' => $payment->only(['code', 'amount', 'status', 'gateway', 'snap_token', 'payment_url', 'expires_at']),
            'midtrans_client_key' => $payment->gateway === 'midtrans' ? config('services.midtrans.client_key') : null,
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
        ], 201);
    }

    public function payment(Request $request, string $code): JsonResponse
    {
        $payment = Payment::where('code', $code)->where('user_id', $request->user()->id)
            ->with('orders:id,payment_id,order_number,status,total,shop_id', 'orders.shop:id,name,slug')->firstOrFail();

        return response()->json([
            ...$payment->only(['code', 'amount', 'status', 'gateway', 'method', 'snap_token', 'payment_url', 'paid_at', 'expires_at', 'orders']),
            'midtrans_client_key' => $payment->gateway === 'midtrans' ? config('services.midtrans.client_key') : null,
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
            'can_simulate' => $payment->gateway === 'mock' && ! app()->isProduction(),
        ]);
    }

    public function simulate(Request $request, string $code, OrderService $orders): JsonResponse
    {
        abort_if(app()->isProduction() || config('marketplace.payment_gateway') !== 'mock', 404);

        $payment = Payment::where('code', $code)->where('user_id', $request->user()->id)->where('gateway', 'mock')->firstOrFail();
        $orders->markPaymentPaid($payment, 'mock_transfer');

        return response()->json(['message' => 'Pembayaran simulasi berhasil.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'address_id' => ['required', 'integer'],
            'shops' => ['sometimes', 'array', 'max:50'],
            'shops.*.shop_id' => ['required', 'integer'],
            'shops.*.courier_code' => ['nullable', 'string', 'max:20'],
            'shops.*.courier_service' => ['nullable', 'string', 'max:60'],
            'shops.*.voucher_code' => ['nullable', 'string', 'max:32'],
            'shops.*.note' => ['nullable', 'string', 'max:255'],
            'platform_voucher_code' => ['nullable', 'string', 'max:32'],
        ]);
    }
}
