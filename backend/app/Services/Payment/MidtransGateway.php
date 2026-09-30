<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Midtrans Snap: https://docs.midtrans.com/reference/snap-api
 */
class MidtransGateway implements PaymentGateway
{
    public function __construct(private readonly string $serverKey, private readonly bool $production) {}

    private function snapUrl(): string
    {
        return $this->production ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    }

    private function apiUrl(): string
    {
        return $this->production ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';
    }

    public function createTransaction(Payment $payment, array $items): array
    {
        $user = $payment->user;

        $response = Http::withBasicAuth($this->serverKey, '')
            ->acceptJson()
            ->timeout(20)
            ->post($this->snapUrl(), [
                'transaction_details' => ['order_id' => $payment->code, 'gross_amount' => $payment->amount],
                'item_details' => array_map(fn ($i) => [
                    'id' => mb_substr($i['id'], 0, 50),
                    'name' => mb_substr($i['name'], 0, 50),
                    'price' => $i['price'],
                    'quantity' => $i['quantity'],
                ], $items),
                'customer_details' => [
                    'first_name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                ],
                'expiry' => [
                    'unit' => 'minutes',
                    'duration' => (int) config('marketplace.payment_expiry_minutes'),
                ],
                'callbacks' => ['finish' => config('marketplace.frontend_url').'/payment/'.$payment->code],
            ]);

        if ($response->failed()) {
            Log::error('Midtrans create transaction failed', ['code' => $payment->code, 'body' => $response->json()]);
            throw new RuntimeException('Gagal membuat transaksi pembayaran. Silakan coba lagi.');
        }

        return [
            'reference' => null,
            'token' => $response->json('token'),
            'url' => $response->json('redirect_url'),
            'raw' => $response->json(),
        ];
    }

    public function parseNotification(Request $request): ?array
    {
        $orderId = (string) $request->input('order_id');
        $expected = hash('sha512', $orderId.$request->input('status_code').$request->input('gross_amount').$this->serverKey);

        if (! hash_equals($expected, (string) $request->input('signature_key'))) {
            return null;
        }

        // Verifikasi ulang langsung ke API Midtrans agar tidak bergantung pada payload webhook.
        $status = Http::withBasicAuth($this->serverKey, '')->acceptJson()->timeout(15)
            ->get($this->apiUrl().'/'.rawurlencode($orderId).'/status');
        $data = $status->successful() ? $status->json() : $request->all();

        $transactionStatus = $data['transaction_status'] ?? null;
        $fraud = $data['fraud_status'] ?? 'accept';

        $mapped = match (true) {
            $transactionStatus === 'capture' && $fraud === 'accept', $transactionStatus === 'settlement' => 'paid',
            $transactionStatus === 'pending' => 'pending',
            $transactionStatus === 'expire' => 'expired',
            in_array($transactionStatus, ['deny', 'cancel', 'failure'], true), $fraud === 'deny' => 'failed',
            in_array($transactionStatus, ['refund', 'partial_refund'], true) => 'refunded',
            default => 'pending',
        };

        return [
            'code' => $orderId,
            'status' => $mapped,
            'method' => $data['payment_type'] ?? null,
            'gross_amount' => (int) round((float) ($data['gross_amount'] ?? 0)),
            'raw' => $data,
        ];
    }
}
