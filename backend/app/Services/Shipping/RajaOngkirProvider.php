<?php

namespace App\Services\Shipping;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Integrasi RajaOngkir (Komerce API v1): https://rajaongkir.com/docs
 */
class RajaOngkirProvider implements ShippingProvider
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly string $couriers,
    ) {}

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeaders(['key' => $this->apiKey])
            ->acceptJson()
            ->timeout(15)
            ->retry(2, 300, throw: false);
    }

    public function searchDestination(string $keyword): array
    {
        $response = $this->client()->get('destination/domestic-destination', [
            'search' => $keyword,
            'limit' => 20,
            'offset' => 0,
        ]);

        if ($response->status() === 404) {
            return [];
        }

        $this->ensureOk($response, 'search destination');

        return collect($response->json('data', []))->map(fn (array $d) => [
            'id' => (int) $d['id'],
            'label' => $d['label'] ?? implode(', ', array_filter([
                $d['subdistrict_name'] ?? null, $d['district_name'] ?? null, $d['city_name'] ?? null, $d['province_name'] ?? null,
            ])),
            'postal_code' => isset($d['zip_code']) && $d['zip_code'] !== '0' ? (string) $d['zip_code'] : null,
        ])->all();
    }

    public function rates(int $origin, int $destination, int $weight, ?string $couriers = null): array
    {
        $response = $this->client()->asForm()->post('calculate/domestic-cost', [
            'origin' => $origin,
            'destination' => $destination,
            'weight' => $weight,
            'courier' => $couriers ?? $this->couriers,
            'price' => 'lowest',
        ]);

        $this->ensureOk($response, 'calculate cost');

        return collect($response->json('data', []))->map(fn (array $r) => [
            'code' => strtolower((string) $r['code']),
            'name' => (string) $r['name'],
            'service' => (string) $r['service'],
            'description' => (string) ($r['description'] ?? ''),
            'cost' => (int) $r['cost'],
            'etd' => (string) ($r['etd'] ?? ''),
        ])->all();
    }

    public function track(string $awb, string $courier): array
    {
        $response = $this->client()->post('track/waybill?'.http_build_query(['awb' => $awb, 'courier' => $courier]));

        $this->ensureOk($response, 'track waybill');

        $data = $response->json('data', []);

        return [
            'delivered' => (bool) ($data['delivered'] ?? false),
            'summary' => $data['summary'] ?? [],
            'history' => collect($data['manifest'] ?? [])->map(fn (array $m) => [
                'date' => trim(($m['manifest_date'] ?? '').' '.($m['manifest_time'] ?? '')),
                'description' => $m['manifest_description'] ?? '',
                'city' => $m['city_name'] ?? '',
            ])->all(),
        ];
    }

    private function ensureOk($response, string $action): void
    {
        if ($response->failed()) {
            Log::warning("RajaOngkir {$action} failed", ['status' => $response->status(), 'body' => $response->json('meta')]);

            throw new RuntimeException('Layanan ongkos kirim sedang tidak tersedia. Coba lagi nanti.');
        }
    }
}
