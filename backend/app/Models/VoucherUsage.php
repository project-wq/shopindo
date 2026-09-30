<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherUsage extends Model
{
    protected $fillable = ['voucher_id', 'user_id', 'payment_id', 'discount'];
}
