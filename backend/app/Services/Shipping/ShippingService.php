<?php

namespace App\Services\Shipping;

use Illuminate\Support\Facades\Cache;

class ShippingService
{
    public function __construct(private readonly ShippingProvider $provider) {}

    public static function make(): self
    {
        $provider = match (config('marketplace.shipping_driver')) {
            'rajaongkir' => new RajaOngkirProvider(
                (string) config('services.rajaongkir.key'),
                (string) config('services.rajaongkir.base_url'),
                (string) config('services.rajaongkir.couriers'),
            ),
            default => new MockShippingProvider,
        };

        return new self($provider);
    }

    public function searchDestination(string $keyword): array
    {
        $keyword = mb_strtolower(trim($keyword));

        return Cache::remember('shipping:dest:'.md5($keyword), now()->addDay(), fn () => $this->provider->searchDestination($keyword));
    }

    public function rates(int $origin, int $destination, int $weight): array
    {
        $weight = max(1, $weight);
        $key = "shipping:rates:{$origin}:{$destination}:{$weight}";

        return Cache::remember($key, now()->addHours(6), function () use ($origin, $destination, $weight) {
            return array_values(array_filter(
                $this->provider->rates($origin, $destination, $weight),
                fn (array $rate) => $rate['cost'] > 0,
            ));
        });
    }

    /**
     * Mencari tarif spesifik di server — harga ongkir tidak pernah dipercaya dari client.
     */
    public function findRate(int $origin, int $destination, int $weight, string $courier, string $service): ?array
    {
        foreach ($this->rates($origin, $destination, $weight) as $rate) {
            if (strcasecmp($rate['code'], $courier) === 0 && strcasecmp($rate['service'], $service) === 0) {
                return $rate;
            }
        }

        return null;
    }

    public function track(string $awb, string $courier): array
    {
        return Cache::remember("shipping:track:{$courier}:{$awb}", now()->addMinutes(30), fn () => $this->provider->track($awb, $courier));
    }
}
