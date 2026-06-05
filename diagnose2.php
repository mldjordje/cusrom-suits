<?php
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I';
$base = 'https://jmnuuekizaljlqdeupqr.supabase.co';

function sb($path, $key, $base) {
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL=>$base.$path, CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>['apikey:'.$key,'Authorization: Bearer '.$key,'Range: 0-4']]);
    $r = curl_exec($ch); curl_close($ch);
    return json_decode($r, true) ?? [];
}

// Prvih 5 zapisa iz catalog_product_media
echo '<h3>Prvih 5 zapisa iz catalog_product_media:</h3>';
$media = sb('/rest/v1/catalog_product_media?select=legacy_product_id,url,is_cover&order=legacy_product_id.asc', $key, $base);
foreach ($media as $m) {
    echo "legacy_product_id={$m['legacy_product_id']} | url={$m['url']}<br>";
}

// Poslednjih 5 (najvisi ID-ovi)
echo '<h3>Poslednjih 5 zapisa (najvisi legacy_product_id):</h3>';
$mediaDesc = sb('/rest/v1/catalog_product_media?select=legacy_product_id,url&order=legacy_product_id.desc', $key, $base);
foreach ($mediaDesc as $m) {
    echo "legacy_product_id={$m['legacy_product_id']} | url={$m['url']}<br>";
}

// Koliko ima is_active=false proizvoda u catalog_products
echo '<h3>Aktivni vs neaktivni u catalog_products:</h3>';
$active = sb('/rest/v1/catalog_products?select=legacy_id&is_active=eq.true&order=legacy_id.asc', $key, $base);
$inactive = sb('/rest/v1/catalog_products?select=legacy_id,sku&is_active=eq.false&order=legacy_id.asc', $key, $base);
echo 'Prvih 5 aktivnih legacy_id: ' . implode(', ', array_column($active, 'legacy_id')) . '<br>';
echo 'Prvih 5 neaktivnih legacy_id: ' . implode(', ', array_column($inactive, 'legacy_id')) . '<br>';
echo 'Prvih 5 neaktivnih SKU: ' . implode(', ', array_column($inactive, 'sku')) . '<br>';
