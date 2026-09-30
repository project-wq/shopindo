<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class Upload
{
    public const IMAGE_RULE = ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'];

    public static function image(UploadedFile $file, string $folder): string
    {
        $path = $file->storeAs($folder, bin2hex(random_bytes(16)).'.'.$file->extension(), 'public');

        return Storage::disk('public')->url($path);
    }
}
