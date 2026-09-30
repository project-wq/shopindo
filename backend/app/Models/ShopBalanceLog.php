<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopBalanceLog extends Model
{
    protected $fillable = ['type', 'amount', 'balance_after', 'description', 'reference_type', 'reference_id'];
}
