<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveShop
{
    public function handle(Request $request, Closure $next): Response
    {
        $shop = $request->user()?->shop;

        if (! $shop) {
            return response()->json(['message' => 'Anda belum memiliki toko.'], 403);
        }

        if (! $shop->isActive()) {
            return response()->json(['message' => 'Toko Anda belum aktif atau sedang ditangguhkan.'], 403);
        }

        return $next($request);
    }
}
