<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use App\Models\Withdrawal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WithdrawalController extends Controller
{
    public function index(Request $request)
    {
        return Withdrawal::with('shop:id,name,user_id')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(20);
    }

    public function process(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        abort_unless($withdrawal->status === 'pending', 422, 'Penarikan sudah diproses.');
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($withdrawal, $data) {
            $withdrawal->forceFill($data + ['processed_at' => now()])->save();
            if ($data['status'] === 'rejected') {
                $withdrawal->shop->credit($withdrawal->amount, 'Pengembalian penarikan ditolak', $withdrawal);
            }
        });

        UserNotification::send($withdrawal->shop->user_id, 'finance',
            $data['status'] === 'approved' ? 'Penarikan disetujui' : 'Penarikan ditolak',
            'Penarikan Rp'.number_format($withdrawal->amount, 0, ',', '.').($data['status'] === 'approved' ? ' telah ditransfer.' : ' ditolak: '.($data['admin_note'] ?? '-')));

        return response()->json($withdrawal);
    }
}
