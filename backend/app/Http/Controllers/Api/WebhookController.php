<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\OrderService;
use App\Services\Payment\PaymentManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(private readonly PaymentManager $payments, private readonly OrderService $orders) {}

    public function midtrans(Request $request): JsonResponse
    {
        return $this->handle($request, 'midtrans');
    }

    public function xendit(Request $request): JsonResponse
    {
        return $this->handle($request, 'xendit');
    }

    private function handle(Request $request, string $gateway): JsonResponse
    {
        $notification = $this->payments->gateway($gateway)->parseNotification($request);

        if (! $notification) {
            Log::warning("Invalid {$gateway} webhook signature", ['ip' => $request->ip()]);

            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $payment = Payment::where('code', $notification['code'])->where('gateway', $gateway)->first();
        if (! $payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        if ($notification['status'] === 'paid' && ($notification['gross_amount'] ?? 0) !== $payment->amount) {
            Log::critical("{$gateway} amount mismatch", ['code' => $payment->code, 'expected' => $payment->amount, 'got' => $notification['gross_amount']]);

            return response()->json(['message' => 'Amount mismatch'], 422);
        }

        match ($notification['status']) {
            'paid' => $this->orders->markPaymentPaid($payment, $notification['method'], $notification['raw']),
            'expired' => $this->orders->failPayment($payment, 'expired', 'Pembayaran kedaluwarsa'),
            'failed' => $this->orders->failPayment($payment, 'failed', 'Pembayaran gagal'),
            'refunded' => $payment->update(['status' => 'refunded']),
            default => null,
        };

        return response()->json(['message' => 'OK']);
    }
}
