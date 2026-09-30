<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Gateway tiruan untuk development. Pembayaran disimulasikan lewat endpoint /payments/{code}/simulate.
 */
class MockGateway implements PaymentGateway
{
    public function createTransaction(Payment $payment, array $items): array
    {
        return [
            'reference' => 'MOCK-'.$payment->code,
            'token' => null,
            'url' => config('marketplace.frontend_url').'/payment/'.$payment->code,
            'raw' => ['mock' => true],
        ];
    }

    public function parseNotification(Request $request): ?array
    {
        return null;
    }
}
