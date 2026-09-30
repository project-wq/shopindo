<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Support\Upload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Banner::orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, true);
        $banner = Banner::create($data);
        Cache::forget('home:static');

        return response()->json($banner, 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $banner->update($this->validated($request, false));
        Cache::forget('home:static');

        return response()->json($banner);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        $banner->delete();
        Cache::forget('home:static');

        return response()->json(['message' => 'Banner dihapus.']);
    }

    private function validated(Request $request, bool $creating): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'image' => [$creating ? 'required_without:image_url' : 'nullable', ...Upload::IMAGE_RULE],
            'image_url' => ['nullable', 'url:https', 'max:500'],
            'link' => ['nullable', 'string', 'max:255', 'regex:/^(\/|https:\/\/)/'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = Upload::image($request->file('image'), 'banners');
        } elseif (! empty($data['image_url'])) {
            $data['image'] = $data['image_url'];
        } else {
            unset($data['image']);
        }
        unset($data['image_url']);

        return $data;
    }
}
