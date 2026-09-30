<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Shop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $asSeller = $request->boolean('as_seller') && $user->shop;

        $conversations = Conversation::with(['user:id,name,avatar', 'shop:id,name,slug,logo,user_id', 'latestMessage'])
            ->when($asSeller, fn ($q) => $q->where('shop_id', $user->shop->id), fn ($q) => $q->where('user_id', $user->id))
            ->withCount(['messages as unread_count' => fn ($q) => $q->whereNull('read_at')->where('sender_id', '!=', $user->id)])
            ->orderByDesc('last_message_at')->limit(100)->get();

        return response()->json($conversations);
    }

    public function start(Request $request, Shop $shop): JsonResponse
    {
        abort_if($shop->user_id === $request->user()->id, 422, 'Tidak bisa chat dengan toko sendiri.');

        $conversation = Conversation::firstOrCreate(['user_id' => $request->user()->id, 'shop_id' => $shop->id]);

        return response()->json($conversation->load('shop:id,name,slug,logo,user_id', 'user:id,name,avatar'));
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $conversation->load('shop:id,name,slug,logo,user_id', 'user:id,name,avatar');
        abort_unless($conversation->hasParticipant($request->user()), 404);

        $conversation->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->when($request->integer('after'), fn ($q, $after) => $q->where('id', '>', $after))
            ->latest('id')->limit(100)->get()->reverse()->values();

        return response()->json(['conversation' => $conversation, 'messages' => $messages]);
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $conversation->load('shop');
        abort_unless($conversation->hasParticipant($request->user()), 404);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = $conversation->messages()->create(['sender_id' => $request->user()->id, 'body' => $data['body']]);
        $conversation->update(['last_message_at' => now()]);

        return response()->json($message, 201);
    }
}
