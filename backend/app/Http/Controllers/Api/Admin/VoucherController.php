<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Seller\VoucherController as SellerVoucherController;
use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function index()
    {
        return Voucher::whereNull('shop_id')->latest()->paginate(20);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Voucher::create(SellerVoucherController::validateVoucher($request, null, true)), 201);
    }

    public function update(Request $request, Voucher $voucher): JsonResponse
    {
        abort_unless($voucher->shop_id === null, 404);
        $voucher->update(SellerVoucherController::validateVoucher($request, $voucher, true));

        return response()->json($voucher);
    }

    public function destroy(Voucher $voucher): JsonResponse
    {
        abort_unless($voucher->shop_id === null, 404);
        $voucher->used_count > 0 ? $voucher->update(['is_active' => false]) : $voucher->delete();

        return response()->json(['message' => 'Voucher dihapus.']);
    }
}
