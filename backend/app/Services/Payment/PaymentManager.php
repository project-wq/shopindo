<?php

namespace App\Services\Payment;

use InvalidArgumentException;

class PaymentManager
{
    public function gateway(?string $name = null): PaymentGateway
    {
        $name ??= config('marketplace.payment_gateway');

        return match ($name) {
            'midtrans' => new MidtransGateway(
                (string) config('services.midtrans.server_key'),
                (bool) config('services.midtrans.is_production'),
            ),
            'xendit' => new XenditGateway(
                (string) config('services.xendit.secret_key'),
                (string) config('services.xendit.callback_token'),
                (string) config('services.xendit.base_url'),
            ),
            'mock' => new MockGateway,
            default => throw new InvalidArgumentException("Payment gateway [{$name}] tidak dikenal."),
        };
    }

    public function defaultName(): string
    {
        return (string) config('marketplace.payment_gateway');
    }
}
