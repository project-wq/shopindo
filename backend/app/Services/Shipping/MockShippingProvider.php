<?php

namespace App\Services\Shipping;

/**
 * Provider ongkir tiruan untuk development/testing tanpa API key RajaOngkir.
 */
class MockShippingProvider implements ShippingProvider
{
    private const DESTINATIONS = [
        1001 => ['Gambir, Gambir, Jakarta Pusat, DKI Jakarta', '10110'],
        1002 => ['Kebayoran Baru, Kebayoran Baru, Jakarta Selatan, DKI Jakarta', '12110'],
        1003 => ['Cengkareng, Cengkareng, Jakarta Barat, DKI Jakarta', '11730'],
        2001 => ['Coblong, Coblong, Bandung, Jawa Barat', '40132'],
        2002 => ['Bekasi Selatan, Bekasi Selatan, Bekasi, Jawa Barat', '17141'],
        3001 => ['Genteng, Genteng, Surabaya, Jawa Timur', '60275'],
        3002 => ['Klojen, Klojen, Malang, Jawa Timur', '65111'],
        4001 => ['Semarang Tengah, Semarang Tengah, Semarang, Jawa Tengah', '50132'],
        5001 => ['Gondokusuman, Gondokusuman, Yogyakarta, DI Yogyakarta', '55221'],
        6001 => ['Medan Kota, Medan Kota, Medan, Sumatera Utara', '20212'],
        7001 => ['Denpasar Barat, Denpasar Barat, Denpasar, Bali', '80119'],
        8001 => ['Makassar, Makassar, Makassar, Sulawesi Selatan', '90111'],
    ];

    public function searchDestination(string $keyword): array
    {
        return collect(self::DESTINATIONS)
            ->filter(fn ($d) => $keyword === '' || str_contains(mb_strtolower($d[0]), $keyword))
            ->map(fn ($d, $id) => ['id' => $id, 'label' => $d[0], 'postal_code' => $d[1]])
            ->values()
            ->all();
    }

    public function rates(int $origin, int $destination, int $weight, ?string $couriers = null): array
    {
        $kg = max(1, (int) ceil($weight / 1000));
        $zone = intdiv($origin, 1000) === intdiv($destination, 1000) ? 1 : 2 + abs(intdiv($origin, 1000) - intdiv($destination, 1000)) % 3;

        $services = [
            ['jne', 'JNE', 'REG', 'Layanan Reguler', 9000, '2-3'],
            ['jne', 'JNE', 'YES', 'Yakin Esok Sampai', 18000, '1'],
            ['sicepat', 'SiCepat', 'REG', 'Reguler', 8500, '2-3'],
            ['jnt', 'J&T Express', 'EZ', 'Reguler', 9500, '2-4'],
            ['anteraja', 'AnterAja', 'REG', 'Regular', 8000, '3-4'],
        ];

        return array_map(fn ($s) => [
            'code' => $s[0],
            'name' => $s[1],
            'service' => $s[2],
            'description' => $s[3],
            'cost' => $s[4] * $kg * $zone,
            'etd' => $zone === 1 ? $s[5] : ($s[5] === '1' ? '1-2' : '3-5'),
        ], $services);
    }

    public function track(string $awb, string $courier): array
    {
        return [
            'delivered' => false,
            'summary' => ['courier_name' => strtoupper($courier), 'waybill_number' => $awb, 'status' => 'ON PROCESS'],
            'history' => [
                ['date' => now()->subHours(20)->format('Y-m-d H:i'), 'description' => 'Paket diterima di gudang asal', 'city' => 'Origin'],
                ['date' => now()->subHours(8)->format('Y-m-d H:i'), 'description' => 'Paket dalam perjalanan ke kota tujuan', 'city' => 'Transit'],
            ],
        ];
    }
}
