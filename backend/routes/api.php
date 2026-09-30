<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\Customer;
use App\Http\Controllers\Api\Seller;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ===== Auth =====
    Route::middleware('throttle:auth')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
    });

    // ===== Publik (katalog) =====
    Route::get('home', [CatalogController::class, 'home']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{slug}', [CatalogController::class, 'product'])->name('products.show');
    Route::get('products/{slug}/related', [CatalogController::class, 'relatedProducts']);
    Route::get('products/{slug}/reviews', [CatalogController::class, 'productReviews']);
    Route::get('shops/{slug}', [CatalogController::class, 'shop']);
    Route::get('flash-sales', [CatalogController::class, 'flashSales']);
    Route::get('vouchers', [CatalogController::class, 'platformVouchers']);
    Route::get('locations', [CatalogController::class, 'destinations'])->middleware('throttle:30,1');
    Route::post('ads/{ad}/click', [CatalogController::class, 'trackAdClick'])->middleware('throttle:20,1');

    // ===== Webhook payment gateway =====
    Route::middleware('throttle:webhook')->group(function () {
        Route::post('webhooks/midtrans', [WebhookController::class, 'midtrans']);
        Route::post('webhooks/xendit', [WebhookController::class, 'xendit']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:auth');

        // ===== Customer =====
        Route::apiResource('addresses', Customer\AddressController::class)->except('show');

        Route::get('cart', [Customer\CartController::class, 'index']);
        Route::post('cart', [Customer\CartController::class, 'store']);
        Route::patch('cart/select-all', [Customer\CartController::class, 'selectAll']);
        Route::patch('cart/{cartItem}', [Customer\CartController::class, 'update']);
        Route::delete('cart/{cartItem}', [Customer\CartController::class, 'destroy']);

        Route::get('wishlist', [Customer\WishlistController::class, 'index']);
        Route::get('wishlist/{product}', [Customer\WishlistController::class, 'status']);
        Route::post('wishlist/{product}', [Customer\WishlistController::class, 'toggle']);
        Route::post('shops/{shop}/follow', [Customer\WishlistController::class, 'toggleFollow']);

        Route::middleware('throttle:checkout')->group(function () {
            Route::post('checkout/quote', [Customer\CheckoutController::class, 'quote']);
            Route::post('checkout', [Customer\CheckoutController::class, 'store']);
            Route::post('payments/{code}/simulate', [Customer\CheckoutController::class, 'simulate']);
        });
        Route::get('payments/{code}', [Customer\CheckoutController::class, 'payment']);

        Route::get('orders', [Customer\OrderController::class, 'index']);
        Route::get('orders/{order}', [Customer\OrderController::class, 'show']);
        Route::post('orders/{order}/cancel', [Customer\OrderController::class, 'cancel']);
        Route::post('orders/{order}/complete', [Customer\OrderController::class, 'complete']);
        Route::get('orders/{order}/track', [Customer\OrderController::class, 'track'])->middleware('throttle:20,1');
        Route::post('orders/{order}/review', [Customer\OrderController::class, 'review']);

        Route::get('chats', [Customer\ChatController::class, 'index']);
        Route::post('chats/shops/{shop}', [Customer\ChatController::class, 'start']);
        Route::get('chats/{conversation}', [Customer\ChatController::class, 'messages']);
        Route::post('chats/{conversation}', [Customer\ChatController::class, 'send'])->middleware('throttle:chat');

        Route::get('notifications', [Customer\NotificationController::class, 'index']);
        Route::post('notifications/read-all', [Customer\NotificationController::class, 'markAllRead']);

        Route::post('seller/register', [Seller\ShopController::class, 'register']);

        // ===== Seller =====
        Route::prefix('seller')->middleware('role:seller')->group(function () {
            Route::get('shop', [Seller\ShopController::class, 'show']);
            Route::post('shop', [Seller\ShopController::class, 'update']);

            Route::middleware('shop.active')->group(function () {
                Route::get('dashboard', [Seller\ShopController::class, 'dashboard']);

                Route::get('products', [Seller\ProductController::class, 'index']);
                Route::post('products', [Seller\ProductController::class, 'store']);
                Route::get('products/{product}', [Seller\ProductController::class, 'show'])->name('seller.products.show');
                Route::post('products/{product}', [Seller\ProductController::class, 'update']);
                Route::delete('products/{product}', [Seller\ProductController::class, 'destroy']);

                Route::get('orders', [Seller\OrderController::class, 'index']);
                Route::get('orders/{order}', [Seller\OrderController::class, 'show']);
                Route::post('orders/{order}/process', [Seller\OrderController::class, 'process']);
                Route::post('orders/{order}/ship', [Seller\OrderController::class, 'ship']);
                Route::post('orders/{order}/cancel', [Seller\OrderController::class, 'cancel']);

                Route::apiResource('vouchers', Seller\VoucherController::class)->except('show');

                Route::get('flash-sales', [Seller\FlashSaleController::class, 'index']);
                Route::post('flash-sales/{flashSale}/register', [Seller\FlashSaleController::class, 'register']);
                Route::delete('flash-sale-items/{item}', [Seller\FlashSaleController::class, 'withdraw']);

                Route::apiResource('ads', Seller\AdController::class)->except('show');

                Route::get('finance', [Seller\FinanceController::class, 'index']);
                Route::post('finance/withdraw', [Seller\FinanceController::class, 'withdraw'])->middleware('throttle:5,1');

                Route::get('reviews', [Seller\ReviewController::class, 'index']);
                Route::post('reviews/{review}/reply', [Seller\ReviewController::class, 'reply']);
            });
        });

        // ===== Admin =====
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('dashboard', Admin\DashboardController::class);

            Route::get('users', [Admin\UserController::class, 'index']);
            Route::post('users/{user}/toggle-active', [Admin\UserController::class, 'toggleActive']);

            Route::get('shops', [Admin\ShopController::class, 'index']);
            Route::patch('shops/{shop}/status', [Admin\ShopController::class, 'updateStatus']);

            Route::apiResource('categories', Admin\CategoryController::class)->except('show');

            Route::get('products', [Admin\ProductController::class, 'index']);
            Route::post('products/{product}/ban', [Admin\ProductController::class, 'ban']);
            Route::post('products/{product}/unban', [Admin\ProductController::class, 'unban']);

            Route::get('orders', [Admin\OrderController::class, 'index']);
            Route::get('orders/{order}', [Admin\OrderController::class, 'show']);

            Route::apiResource('vouchers', Admin\VoucherController::class)->except('show');

            Route::apiResource('flash-sales', Admin\FlashSaleController::class);
            Route::patch('flash-sale-items/{item}', [Admin\FlashSaleController::class, 'reviewItem']);

            Route::get('banners', [Admin\BannerController::class, 'index']);
            Route::post('banners', [Admin\BannerController::class, 'store']);
            Route::post('banners/{banner}', [Admin\BannerController::class, 'update']);
            Route::delete('banners/{banner}', [Admin\BannerController::class, 'destroy']);

            Route::get('withdrawals', [Admin\WithdrawalController::class, 'index']);
            Route::patch('withdrawals/{withdrawal}', [Admin\WithdrawalController::class, 'process']);
        });
    });
});
