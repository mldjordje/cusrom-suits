<?php
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I';
$base = 'https://jmnuuekizaljlqdeupqr.supabase.co';

function sbRange($path, $key, $base, $from=0, $to=999) {
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL=>$base.$path, CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>['apikey:'.$key,'Authorization: Bearer '.$key,'Range-Unit: items','Range: '.$from.'-'.$to]]);
    $r = curl_exec($ch); curl_close($ch);
    return json_decode($r, true) ?? [];
}

// Uzmi prvih 10 proizvoda koji IMAJU slike (legacy_id u opsegu 26533+)
// Nadji njihove SKU-ove u catalog_products
echo '<h3>Proizvodi u catalog_products sa legacy_id u opsegu koji ima slike (26000-16000000):</h3>';
$prods = sbRange('/rest/v1/catalog_products?select=legacy_id,sku,name_sr,is_active&legacy_id=gte.26000&legacy_id=lte.16000000&order=legacy_id.asc', $key, $base, 0, 9);
foreach ($prods as $p) {
    $active = $p['is_active'] ? 'AKTIVAN' : 'neaktivan';
    echo "legacy_id={$p['legacy_id']} | sku={$p['sku']} | naziv={$p['name_sr']} | $active<br>";
}

echo '<hr>';

// Uzmi mOffice SKU-ove
echo '<h3>mOffice SKU-ovi (prvih 10):</h3>';
$moffice = sbRange('/rest/v1/catalog_products?select=legacy_id,sku,name_sr&raw_payload->>source=eq.moffice&order=legacy_id.asc', $key, $base, 0, 9);
foreach ($moffice as $p) {
    echo "legacy_id={$p['legacy_id']} | sku={$p['sku']} | naziv={$p['name_sr']}<br>";
}

echo '<hr>';

// Koliko ukupno ima proizvoda u opsegu sa slikama
echo '<h3>Ukupno proizvoda u opsegu 26000-16000000:</h3>';
$count = sbRange('/rest/v1/catalog_products?select=legacy_id&legacy_id=gte.26000&legacy_id=lte.16000000', $key, $base, 0, 0);
echo 'Provjeri Supabase dashboard za tacan broj<br>';

// Da li ima poklapanja SKU između mOffice i opsega sa slikama?
echo '<h3>SKU poklapanje — mOffice vs produkti sa slikama:</h3>';
$mSkus = array_column($moffice, 'sku');
$pSkus = array_column($prods, 'sku');
$match = array_intersect($mSkus, $pSkus);
echo 'Poklapanja: ' . count($match) . '<br>';
if ($match) echo implode(', ', $match);
