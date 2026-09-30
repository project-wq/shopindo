<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->addresses()->orderByDesc('is_default')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->addresses()->count() >= 10) {
            return response()->json(['message' => 'Maksimal 10 alamat.'], 422);
        }

        $data = $this->validated($request);
        $data['is_default'] = ($data['is_default'] ?? false) || ! $user->addresses()->exists();

        $address = DB::transaction(function () use ($user, $data) {
            if ($data['is_default']) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create($data);
        });

        return response()->json($address, 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $address, $data) {
            if (! empty($data['is_default'])) {
                $request->user()->addresses()->update(['is_default' => false]);
            }
            $address->update($data);
        });

        return response()->json($address->fresh());
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $address->delete();

        if ($address->is_default) {
            $request->user()->addresses()->oldest()->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Alamat dihapus.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'recipient_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'regex:/^(\+62|62|0)8[0-9]{7,12}$/'],
            'destination_id' => ['required', 'integer', 'min:1'],
            'destination_label' => ['required', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'address_line' => ['required', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }
}
