<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    protected $fillable = [
        'label', 'recipient_name', 'phone', 'destination_id', 'destination_label',
        'postal_code', 'address_line', 'is_default',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'destination_id' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toSnapshot(): array
    {
        return $this->only([
            'recipient_name', 'phone', 'destination_id', 'destination_label', 'postal_code', 'address_line',
        ]);
    }
}
