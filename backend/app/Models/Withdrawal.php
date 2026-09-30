<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Withdrawal extends Model
{
    protected $fillable = ['amount', 'bank_name', 'account_number', 'account_name'];

    protected function casts(): array
    {
        return ['processed_at' => 'datetime', 'amount' => 'integer'];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }
}
