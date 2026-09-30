<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Xendit Invoice API: https://docs.xendit.co/apidocs/create-invoice
 */
class XenditGateway implements PaymentGateway
{
    public function __construct(
        private readonly string $secretKey,
        private readonly string $callbackToken,
        private readonly string $baseUrl,
    ) {}

    public function createTransaction(Payment $payment, array $items): array
    {
        $user = $payment->user;
        $frontend = config('marketplace.frontend_url');

        $response = Http::withBasicAuth($this->secretKey, '')
            ->acceptJson()
            ->timeout(20)
            ->post(rtrim($this->baseUrl, '/').'/v2/invoices', [
                'external_id' => $payment->code,
                'amount' => $payment->amount,
                'payer_email' => $user->email,
                'description' => 'Pembayaran '.$payment->code,
                'invoice_duration' => (int) config('marketplace.payment_expiry_minutes') * 60,
                'currency' => 'IDR',
                'customer' => ['given_names' => $user->name, 'email' => $user->email, 'mobile_number' => $user->phone],
                'items' => array_map(fn ($i) => [
                    'name' => mb_substr($i['name'], 0, 255),
                    'price' => $i['price'],
                    'quantity' => $i['quantity'],
                ], array_values(array_filter($items, fn ($i) => $i['price'] > 0))),
                'success_redirect_url' => $frontend.'/payment/'.$payment->code,
                'failure_redirect_url' => $frontend.'/payment/'.$payment->code,
            ]);

        if ($response->failed()) {
            Log::error('Xendit create invoice failed', ['code' => $payment->code, 'body' => $response->json()]);
            throw new RuntimeException('Gagal membuat transaksi pembayaran. Silakan coba lagi.');
        }

        return [
            'reference' => $response->json('id'),
            'token' => null,
            'url' => $response->json('invoice_url'),
            'raw' => $response->json(),
        ];
    }

    public function parseNotification(Request $request): ?array
    {
        if ($this->callbackToken === '' || ! hash_equals($this->callbackToken, (string) $request->header('x-callback-token'))) {
            return null;
        }

        $mapped = match (strtoupper((string) $request->input('status'))) {
            'PAID', 'SETTLED' => 'paid',
            'EXPIRED' => 'expired',
            default => 'pending',
        };

        return [
            'code' => (string) $request->input('external_id'),
            'status' => $mapped,
            'method' => $request->input('payment_method') ?: $request->input('payment_channel'),
            'gross_amount' => (int) ($request->input('paid_amount') ?? $request->input('amount') ?? 0),
            'raw' => $request->all(),
        ];
    }
}
