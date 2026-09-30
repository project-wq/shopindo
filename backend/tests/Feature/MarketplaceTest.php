<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MarketplaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['marketplace.shipping_driver' => 'mock', 'marketplace.payment_gateway' => 'mock']);
        $this->seed();
    }

    private function user(string $email): User
    {
        return User::where('email', $email)->firstOrFail();
    }

    private function placeOrder(): Payment
    {
        $customer = $this->user('customer@shopindo.test');
        $product = Product::doesntHave('variants')->where('status', 'active')->where('price', '>=', 60000)->firstOrFail();

        $this->actingAs($customer)->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 1])->assertSuccessful();

        $quote = $this->actingAs($customer)->postJson('/api/v1/checkout/quote', [
            'address_id' => $customer->addresses()->first()->id,
            'shops' => [['shop_id' => $product->shop_id]],
        ])->assertOk()->json();

        $rate = $quote['groups'][0]['shipping_rates'][0];

        $response = $this->actingAs($customer)->postJson('/api/v1/checkout', [
            'address_id' => $customer->addresses()->first()->id,
            'shops' => [['shop_id' => $product->shop_id, 'courier_code' => $rate['code'], 'courier_service' => $rate['service']]],
        ])->assertCreated();

        return Payment::where('code', $response->json('payment.code'))->firstOrFail();
    }

    public function test_login_returns_token_and_rejects_wrong_password(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'customer@shopindo.test', 'password' => 'password123'])
            ->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'role']]);

        $this->postJson('/api/v1/auth/login', ['email' => 'customer@shopindo.test', 'password' => 'salah'])
            ->assertStatus(422);
    }

    public function test_role_isolation_between_panels(): void
    {
        $customer = $this->user('customer@shopindo.test');
        $seller = $this->user('seller@shopindo.test');

        $this->getJson('/api/v1/cart')->assertUnauthorized();
        $this->actingAs($customer)->getJson('/api/v1/seller/dashboard')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/v1/admin/dashboard')->assertForbidden();
        $this->actingAs($seller)->getJson('/api/v1/admin/users')->assertForbidden();
        $this->actingAs($this->user('admin@shopindo.test'))->getJson('/api/v1/admin/dashboard')->assertOk();
    }

    public function test_full_order_lifecycle_credits_seller_balance(): void
    {
        $payment = $this->placeOrder();
        $customer = $payment->user;
        $order = $payment->orders()->firstOrFail();
        $seller = $order->shop->owner;
        $balanceBefore = $order->shop->fresh()->makeVisible('balance')->balance;

        $this->actingAs($customer)->postJson("/api/v1/payments/{$payment->code}/simulate")->assertOk();
        $this->assertSame('paid', $order->fresh()->status);

        $this->actingAs($seller)->postJson("/api/v1/seller/orders/{$order->id}/process")->assertOk();
        $this->actingAs($seller)->postJson("/api/v1/seller/orders/{$order->id}/ship", ['tracking_number' => 'JNE1234567890'])->assertOk();
        $this->actingAs($customer)->getJson("/api/v1/orders/{$order->id}/track")->assertOk()->assertJsonStructure(['history']);
        $this->actingAs($customer)->postJson("/api/v1/orders/{$order->id}/complete")->assertOk();

        $order->refresh();
        $this->assertSame('completed', $order->status);
        $this->assertSame($balanceBefore + $order->sellerIncome(), $order->shop->fresh()->makeVisible('balance')->balance);

        $item = $order->items()->firstOrFail();
        $this->actingAs($customer)->postJson("/api/v1/orders/{$order->id}/review", [
            'order_item_id' => $item->id, 'rating' => 5, 'comment' => '<script>alert(1)</script>Mantap',
        ])->assertSuccessful();
        $this->assertSame('alert(1)Mantap', $item->review()->first()->comment);
    }

    public function test_customer_cannot_access_other_users_orders(): void
    {
        $payment = $this->placeOrder();
        $order = $payment->orders()->firstOrFail();
        $other = User::factory()->create();

        $this->actingAs($other)->getJson("/api/v1/orders/{$order->id}")->assertForbidden();
    }

    public function test_cancelling_unpaid_order_restores_stock(): void
    {
        $payment = $this->placeOrder();
        $order = $payment->orders()->with('items.product')->firstOrFail();
        $product = $order->items->first()->product;
        $stockAfterCheckout = $product->fresh()->stock;

        $this->actingAs($payment->user)->postJson("/api/v1/orders/{$order->id}/cancel", ['reason' => 'Berubah pikiran'])->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame($stockAfterCheckout + 1, $product->fresh()->stock);
    }

    public function test_midtrans_webhook_rejects_invalid_signature(): void
    {
        $this->postJson('/api/v1/webhooks/midtrans', [
            'order_id' => 'PAY-FAKE', 'status_code' => '200', 'gross_amount' => '10000.00', 'signature_key' => 'invalid',
        ])->assertForbidden();
    }

    public function test_midtrans_webhook_marks_payment_paid_and_rejects_amount_mismatch(): void
    {
        config(['services.midtrans.server_key' => 'SB-test-key']);
        $payment = $this->placeOrder();
        $payment->update(['gateway' => 'midtrans']);

        $status = fn (int $amount) => [
            'order_id' => $payment->code, 'transaction_status' => 'settlement', 'fraud_status' => 'accept',
            'gross_amount' => $amount.'.00', 'payment_type' => 'bank_transfer',
        ];
        Http::fakeSequence()->push($status($payment->amount - 1000))->push($status($payment->amount));

        $send = function (int $amount) use ($payment) {
            $payload = ['order_id' => $payment->code, 'status_code' => '200', 'gross_amount' => $amount.'.00'];
            $payload['signature_key'] = hash('sha512', $payment->code.'200'.$amount.'.00'.'SB-test-key');

            return $this->postJson('/api/v1/webhooks/midtrans', $payload);
        };

        $send($payment->amount - 1000)->assertStatus(422);
        $this->assertSame('pending', $payment->fresh()->status);

        $send($payment->amount)->assertOk();
        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertSame('paid', Order::where('payment_id', $payment->id)->first()->status);
    }

    public function test_xendit_webhook_requires_callback_token(): void
    {
        config(['services.xendit.callback_token' => 'secret-token']);

        $this->postJson('/api/v1/webhooks/xendit', ['external_id' => 'PAY-X', 'status' => 'PAID'], ['x-callback-token' => 'wrong'])
            ->assertForbidden();
    }

    public function test_search_input_is_validated_and_like_wildcards_escaped(): void
    {
        $this->getJson('/api/v1/products?q='.urlencode("' OR 1=1--").'&sort=bogus')->assertStatus(422);
        $this->getJson('/api/v1/products?q=%25')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/products?q=kopi')->assertOk();
    }

    public function test_security_headers_are_present(): void
    {
        $this->getJson('/api/v1/home')->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }

    public function test_seller_can_manage_products_and_admin_can_ban(): void
    {
        $seller = $this->user('seller@shopindo.test');
        $category = $seller->shop->products()->first()->category_id;

        $id = $this->actingAs($seller)->postJson('/api/v1/seller/products', [
            'category_id' => $category, 'name' => 'Produk Uji Coba', 'description' => 'Deskripsi produk uji coba yang cukup panjang.',
            'price' => 25000, 'stock' => 10, 'weight' => 200, 'condition' => 'new',
            'image_urls' => ['https://picsum.photos/seed/test/600/600'],
        ])->assertCreated()->json('data.id');

        $this->actingAs($this->user('admin@shopindo.test'))
            ->postJson("/api/v1/admin/products/{$id}/ban", ['reason' => 'Uji moderasi'])->assertOk();

        $this->assertSame('banned', Product::find($id)->status);
        $this->getJson('/api/v1/products/'.Product::find($id)->slug)->assertNotFound();
    }

    public function test_admin_can_create_platform_voucher(): void
    {
        $this->actingAs($this->user('admin@shopindo.test'))->postJson('/api/v1/admin/vouchers', [
            'code' => 'UJI50', 'name' => 'Voucher Uji', 'type' => 'free_shipping', 'value' => 20000,
            'min_purchase' => 0, 'quota' => 10, 'per_user_limit' => 1,
            'starts_at' => now()->toDateTimeString(), 'ends_at' => now()->addDay()->toDateTimeString(), 'is_active' => true,
        ])->assertCreated();
    }
}
