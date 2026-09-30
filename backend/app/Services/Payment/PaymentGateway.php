<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;

interface PaymentGateway
{
    /**
     * @param  array<int, array{id:string,name:string,price:int,quantity:int}>  $items
     * @return array{reference:?string,token:?string,url:?string,raw:array}
     */
    public function createTransaction(Payment $payment, array $items): array;

    /**
     * Memverifikasi & menerjemahkan notifikasi webhook. Mengembalikan null jika tidak valid.
     *
     * @return array{code:string,status:string,method:?string,raw:array}|null
     */
    public function parseNotification(Request $request): ?array;
}
