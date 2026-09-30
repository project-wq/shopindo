<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use App\Models\Withdrawal;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $paid = Payment::where('status', 'paid')->where('paid_at', '>=', now()->subDays(29)->startOfDay())->get(['paid_at', 'amount'])
            ->groupBy(fn ($p) => $p->paid_at->toDateString())->map->sum('amount');

        return response()->json([
            'users' => User::where('role', 'customer')->count(),
            'sellers' => User::where('role', 'seller')->count(),
            'shops_pending' => Shop::where('status', 'pending')->count(),
            'shops_active' => Shop::where('status', 'active')->count(),
            'products' => Product::count(),
            'orders_today' => Order::whereDate('created_at', today())->count(),
            'gmv' => (int) Payment::where('status', 'paid')->sum('amount'),
            'commission' => (int) Order::where('status', 'completed')->sum('commission'),
            'withdrawals_pending' => Withdrawal::where('status', 'pending')->count(),
            'order_status' => Order::selectRaw('status, COUNT(*) total')->groupBy('status')->pluck('total', 'status'),
            'gmv_chart' => collect(range(29, 0))->map(fn ($d) => now()->subDays($d)->toDateString())
                ->map(fn ($date) => ['date' => $date, 'total' => (int) ($paid[$date] ?? 0)]),
        ]);
    }
}
