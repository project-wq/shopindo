<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        return Review::with(['user:id,name', 'product:id,name,slug'])
            ->where('shop_id', $request->user()->shop->id)->latest()->paginate(20);
    }

    public function reply(Request $request, Review $review): JsonResponse
    {
        abort_unless($review->shop_id === $request->user()->shop->id, 404);
        $data = $request->validate(['reply' => ['required', 'string', 'max:1000']]);
        $review->forceFill(['seller_reply' => $data['reply']])->save();

        return response()->json($review);
    }
}
