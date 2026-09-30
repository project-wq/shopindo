<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with('shop:id,user_id,name,status')
            ->when($request->input('role'), fn ($q, $r) => $q->where('role', $r))
            ->when($request->input('q'), fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'like', '%'.addcslashes($t, '%_\\').'%')
                ->orWhere('email', 'like', '%'.addcslashes($t, '%_\\').'%')))
            ->latest()->paginate(20);
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Tidak dapat menonaktifkan akun sendiri.');
        $user->forceFill(['is_active' => ! $user->is_active])->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json($user);
    }
}
