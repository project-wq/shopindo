<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->shop->vouchers()->latest()->paginate(20);
    }

    public function store(Request $request): JsonResponse
    {
        $voucher = $request->user()->shop->vouchers()->create(self::validateVoucher($request));

        return response()->json($voucher, 201);
    }

    public function update(Request $request, Voucher $voucher): JsonResponse
    {
        abort_unless($voucher->shop_id === $request->user()->shop->id, 404);
        $voucher->update(self::validateVoucher($request, $voucher));

        return response()->json($voucher);
    }

    public function destroy(Request $request, Voucher $voucher): JsonResponse
    {
        abort_unless($voucher->shop_id === $request->user()->shop->id, 404);
        $voucher->used_count > 0 ? $voucher->update(['is_active' => false]) : $voucher->delete();

        return response()->json(['message' => 'Voucher dihapus.']);
    }

    public static function validateVoucher(Request $request, ?Voucher $voucher = null, bool $allowFreeShipping = false): array
    {
        $request->merge(['code' => strtoupper((string) $request->input('code'))]);

        return $request->validate([
            'code' => ['required', 'string', 'alpha_num:ascii', 'min:4', 'max:32', 'unique:vouchers,code'.($voucher ? ','.$voucher->id : '')],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', $allowFreeShipping ? 'in:fixed,percentage,free_shipping' : 'in:fixed,percentage'],
            'value' => ['required', 'integer', 'min:1', $request->input('type') === 'percentage' ? 'max:100' : 'max:100000000'],
            'max_discount' => ['nullable', 'integer', 'min:1'],
            'min_purchase' => ['required', 'integer', 'min:0'],
            'quota' => ['required', 'integer', 'min:1', 'max:1000000'],
            'per_user_limit' => ['required', 'integer', 'min:1', 'max:100'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
