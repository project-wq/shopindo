<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TransformsRequest;

/**
 * Menghapus tag HTML dari seluruh input string sebagai lapisan pertahanan terhadap stored XSS.
 */
class SanitizeInput extends TransformsRequest
{
    protected array $except = ['password', 'password_confirmation', 'current_password'];

    protected function transform($key, $value)
    {
        if (! is_string($value) || in_array($key, $this->except, true)) {
            return $value;
        }

        $value = strip_tags($value);

        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    }
}
