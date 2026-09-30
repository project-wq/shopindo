<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\Withdrawal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;

        return response()->json([
            'balance' => $shop->balance,
            'min_withdrawal' => (int) config('marketplace.min_withdrawal'),
            'logs' => $shop->balanceLogs()->latest('id')->paginate(20),
            'withdrawals' => Withdrawal::where('shop_id', $shop->id)->latest()->limit(20)->get(),
        ]);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:'.config('marketplace.min_withdrawal')],
            'bank_name' => ['required', 'string', 'max:50'],
            'account_number' => ['required', 'string', 'regex:/^[0-9]{6,20}$/'],
            'account_name' => ['required', 'string', 'max:100'],
        ]);

        $shop = $request->user()->shop;
        abort_if(Withdrawal::where('shop_id', $shop->id)->where('status', 'pending')->exists(), 422, 'Masih ada penarikan yang diproses.');

        $withdrawal = DB::transaction(function () use ($shop, $data) {
            $withdrawal = new Withdrawal($data);
            $withdrawal->shop_id = $shop->id;
            $withdrawal->save();
            $shop->debit($data['amount'], 'Penarikan dana ke '.$data['bank_name'], $withdrawal);

            return $withdrawal;
        });

        return response()->json($withdrawal, 201);
    }
}
