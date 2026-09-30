<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Category::withCount('products')->orderBy('parent_id')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $category = Category::create($data + ['slug' => $this->slug($data['name'])]);
        Cache::forget('home:static');

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validated($request);
        abort_if(($data['parent_id'] ?? null) === $category->id, 422, 'Kategori tidak bisa menjadi induk dirinya sendiri.');
        if ($data['name'] !== $category->name) {
            $data['slug'] = $this->slug($data['name']);
        }
        $category->update($data);
        Cache::forget('home:static');

        return response()->json($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        abort_if($category->products()->exists(), 422, 'Kategori masih memiliki produk.');
        $category->delete();
        Cache::forget('home:static');

        return response()->json(['message' => 'Kategori dihapus.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    private function slug(string $name): string
    {
        $slug = Str::slug($name);

        return Category::where('slug', $slug)->exists() ? $slug.'-'.Str::lower(Str::random(4)) : $slug;
    }
}
