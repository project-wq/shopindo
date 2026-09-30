<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $fillable = ['user_id', 'type', 'title', 'body', 'data', 'read_at'];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime'];
    }

    public static function send(int $userId, string $type, string $title, string $body, array $data = []): self
    {
        return self::create(compact('type', 'title', 'body', 'data') + ['user_id' => $userId]);
    }
}
