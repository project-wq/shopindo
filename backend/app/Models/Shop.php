<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Shop extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'logo', 'banner', 'phone',
        'origin_destination_id', 'origin_label', 'address',
    ];

    protected $hidden = ['balance'];

    protected function casts(): array
    {
        return [
            'is_official' => 'boolean',
            'rating_avg' => 'float',
            'balance' => 'integer',
            'origin_destination_id' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'shop_followers')->withTimestamps();
    }

    public function balanceLogs(): HasMany
    {
        return $this->hasMany(ShopBalanceLog::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function credit(int $amount, string $description, ?Model $reference = null): void
    {
        $this->adjustBalance('credit', $amount, $description, $reference);
    }

    public function debit(int $amount, string $description, ?Model $reference = null): void
    {
        $this->adjustBalance('debit', $amount, $description, $reference);
    }

    private function adjustBalance(string $type, int $amount, string $description, ?Model $reference): void
    {
        DB::transaction(function () use ($type, $amount, $description, $reference) {
            $shop = self::whereKey($this->id)->lockForUpdate()->firstOrFail();
            if ($type === 'debit' && $shop->balance < $amount) {
                throw new \DomainException('Saldo toko tidak mencukupi.');
            }
            $shop->balance = $type === 'credit' ? $shop->balance + $amount : $shop->balance - $amount;
            $shop->save();

            $shop->balanceLogs()->create([
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $shop->balance,
                'description' => $description,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
            ]);
            $this->balance = $shop->balance;
        });
    }
}
