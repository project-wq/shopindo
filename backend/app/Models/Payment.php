<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'user_id', 'code', 'gateway', 'method', 'amount', 'status', 'gateway_reference', 'snap_token',
        'payment_url', 'platform_voucher_id', 'platform_discount', 'raw_response', 'paid_at', 'expires_at',
    ];

    protected $hidden = ['raw_response'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'platform_discount' => 'integer',
            'raw_response' => 'array',
            'paid_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
