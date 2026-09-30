<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        return Order::with(['user:id,name', 'shop:id,name', 'payment:id,code,status,gateway'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $t) => $q->where('order_number', 'like', '%'.addcslashes($t, '%_\\').'%'))
            ->latest()->paginate(20);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json($order->load(['items', 'user:id,name,email,phone', 'shop:id,name', 'payment']));
    }
}
