<?php
/**
 * Uvoz product_file slika iz starog MySQL-a u Supabase catalog_product_media
 *
 * Korak 1: Postavi export-product-images.php na assets.santos.rs i pozovi ga
 * Korak 2: Pokreni ovaj fajl lokalno ili na serveru
 *
 * Postavi na: assets.santos.rs/import-product-images.php
 * Pokretanje: https://assets.santos.rs/import-product-images.php?token=santos2026import
 */

ini_set('display_errors', 1);
ini_set('max_execution_time', 0);
ini_set('memory_limit', '256M');
error_reporting(E_ALL);

$TOKEN = 'santos2026import';
if (($_GET['token'] ?? '') !== $TOKEN) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

define('SUPABASE_URL', 'https://jmnuuekizaljlqdeupqr.supabase.co');
define('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I');
define('IMAGE_BASE_URL', 'https://assets.santos.rs/fajlovi/product/');

function out($msg) {
    echo '[' . date('H:i:s') . '] ' . $msg . '<br>';
    flush();
    ob_flush();
}

function sbPost($records) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => SUPABASE_URL . '/rest/v1/catalog_product_media',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => json_encode($records),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'apikey: '       . SUPABASE_KEY,
            'Authorization: Bearer ' . SUPABASE_KEY,
            'Content-Type: application/json',
            'Prefer: resolution=ignore-duplicates,return=minimal',
        ],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $body];
}

// Korak 1: Preuzmi export iz starog MySQL
out('Preuzimam product_file export...');
$exportUrl = 'https://assets.santos.rs/export-product-images.php?token=santos2026export';
$ch = curl_init($exportUrl);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 120]);
$json = curl_exec($ch);
curl_close($ch);

$rows = json_decode($json, true);
if (!is_array($rows)) {
    out('GRESKA: Nije moguce preuzeti export. Odgovor: ' . substr($json, 0, 200));
    exit;
}
out('Preuzeto zapisa iz product_file: ' . count($rows));

// Korak 2: Preuzmi sve vec postojece legacy_product_id iz catalog_product_media
out('Preuzimam vec postojece legacy_product_id iz Supabase...');
$ch = curl_init(SUPABASE_URL . '/rest/v1/catalog_product_media?select=legacy_product_id');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_HTTPHEADER     => [
        'apikey: '       . SUPABASE_KEY,
        'Authorization: Bearer ' . SUPABASE_KEY,
        'Range-Unit: items',
        'Range: 0-99999',
    ],
]);
$existingJson = curl_exec($ch);
curl_close($ch);

$existingMedia = json_decode($existingJson, true) ?? [];
$alreadyHasMedia = array_flip(array_unique(array_column($existingMedia, 'legacy_product_id')));
out('Vec ima sliku: ' . count($alreadyHasMedia) . ' proizvoda');

// Korak 3: Grupisi slike po productid
$grouped = [];
foreach ($rows as $r) {
    $grouped[$r['productid']][] = $r;
}
out('Jedinstvenih starih product.id: ' . count($grouped));

// Korak 4: Ubaci u catalog_product_media samo one koji vec nemaju sliku
$inserted  = 0;
$skipped   = 0;
$errors    = 0;
$batchSize = 50;
$batch     = [];

foreach ($grouped as $productId => $images) {
    // Preskoci ako vec ima slike za taj legacy_id
    if (isset($alreadyHasMedia[$productId])) {
        $skipped++;
        continue;
    }

    foreach ($images as $i => $img) {
        // content je ili pun URL ili relativan path
        $content = $img['content'];
        if (strpos($content, 'http') === 0) {
            $url = $content;
        } else {
            // Skini eventualni prefix fajlovi/product/
            $filename = basename($content);
            $url = IMAGE_BASE_URL . rawurlencode($filename);
        }

        $batch[] = [
            'legacy_product_id' => $productId,
            'url'               => $url,
            'sort'              => $i,
            'is_cover'          => $i === 0,
        ];
    }

    if (count($batch) >= $batchSize) {
        $res = sbPost($batch);
        if ($res['code'] >= 200 && $res['code'] < 300) {
            $inserted += count($batch);
        } else {
            out('GRESKA batch (HTTP ' . $res['code'] . '): ' . substr($res['body'], 0, 200));
            $errors += count($batch);
        }
        $batch = [];
    }
}

// Ostatak
if (!empty($batch)) {
    $res = sbPost($batch);
    if ($res['code'] >= 200 && $res['code'] < 300) {
        $inserted += count($batch);
    } else {
        out('GRESKA ostatak (HTTP ' . $res['code'] . '): ' . substr($res['body'], 0, 200));
        $errors += count($batch);
    }
}

out('=== GOTOVO ===');
out("Ubaceno zapisa: $inserted");
out("Preskoceno (vec ima sliku): $skipped");
out("Greske: $errors");
