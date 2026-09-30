<?php

namespace App\Services\Shipping;

interface ShippingProvider
{
    /** @return array<int, array{id:int,label:string,postal_code:?string}> */
    public function searchDestination(string $keyword): array;

    /** @return array<int, array{code:string,name:string,service:string,description:string,cost:int,etd:string}> */
    public function rates(int $origin, int $destination, int $weight, ?string $couriers = null): array;

    /** @return array{delivered:bool,summary:array,history:array} */
    public function track(string $awb, string $courier): array;
}
