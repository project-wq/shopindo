<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->userNotifications()->latest()->paginate(20)
            ->through(fn ($n) => $n)
            ->toArray() + ['unread_count' => $request->user()->userNotifications()->whereNull('read_at')->count()];
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->userNotifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai sudah dibaca.']);
    }
}
