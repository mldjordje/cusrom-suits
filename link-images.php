<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('memory_limit', '256M');
set_time_limit(600);

define('SUPABASE_URL', 'https://jmnuuekizaljlqdeupqr.supabase.co');
define('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I');
define('IMAGE_DIR', '/home/agyc3416/public_html/fajlovi/product/');
define('IMAGE_BASE_URL', 'https://santos.rs/fajlovi/product/');

function out($msg) { echo '['.date('H:i:s').'] '.$msg.'<br>'; flush(); }

function sbGetAll($path) {
    $all = []; $from = 0;
    while (true) {
        $ch = curl_init();
        curl_setopt_array($ch, [CURLOPT_URL=>SUPABASE_URL.'/rest/v1/'.$path, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>60,
            CURLOPT_HTTPHEADER=>['apikey: '.SUPABASE_KEY,'Authorization: Bearer '.SUPABASE_KEY,'Range-Unit: items','Range: '.$from.'-'.($from+999)]]);
        $res = curl_exec($ch); curl_close($ch);
        $batch = json_decode($res, true) ?? [];
        $all = array_merge($all, $batch);
        if (count($batch) < 1000) break;
        $from += 1000;
    }
    return $all;
}

function sbPost($data) {
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL=>SUPABASE_URL.'/rest/v1/catalog_product_media',
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_CUSTOMREQUEST=>'POST', CURLOPT_POSTFIELDS=>json_encode($data), CURLOPT_TIMEOUT=>30,
        CURLOPT_HTTPHEADER=>['apikey: '.SUPABASE_KEY,'Authorization: Bearer '.SUPABASE_KEY,'Content-Type: application/json','Prefer: resolution=ignore-duplicates,return=minimal']]);
    curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return $code;
}

// ============================================================
// Korak 1: Skeniraj folder
// ============================================================
out('Korak 1: Skeniram folder slika...');
if (!is_dir(IMAGE_DIR)) { out('GRESKA: Folder ne postoji: '.IMAGE_DIR); exit; }

$files = scandir(IMAGE_DIR);
$imageFiles = [];
foreach ($files as $f) {
    $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
    if (in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
        $name = pathinfo($f, PATHINFO_FILENAME); // bez ekstenzije
        $imageFiles[strtolower($name)] = $f;     // mapa: naziv_bez_ext => pun_naziv
    }
}
out('Pronadjeno slika u folderu: '.count($imageFiles));
out('Primeri: '.implode(', ', array_slice(array_values($imageFiles), 0, 5)));

// ============================================================
// Korak 2: Ucitaj mOffice artikle
// ============================================================
out('Korak 2: Ucitavam mOffice artikle iz baze...');
$products = sbGetAll('catalog_products?select=legacy_id,sku,ean,raw_payload&raw_payload->>source=eq.moffice');
out('mOffice artikala: '.count($products));

// ============================================================
// Korak 3: Pokusaj da poklopis sliku po vise strategija
// ============================================================
out('Korak 3: Povazujem slike...');

$linked = 0;
$notFound = 0;

foreach ($products as $p) {
    $legacyId = (int)$p['legacy_id'];
    $sku      = trim((string)($p['sku'] ?? ''));
    $ean      = trim((string)($p['ean'] ?? ''));
    $payload  = $p['raw_payload'] ?? [];
    $category = strtolower(trim(is_array($payload) ? ($payload['category'] ?? '') : ''));

    // Generisi kandidate za naziv fajla (bez ekstenzije)
    $candidates = array_filter(array_unique([
        strtolower($sku),
        strtolower($ean),
        strtolower(ltrim($ean, '0')), // bez vodecih nula
        strtolower($sku).'_1',
        strtolower($sku).'_01',
    ]));

    $matched = [];
    foreach ($candidates as $c) {
        if (isset($imageFiles[$c])) {
            $matched[] = $imageFiles[$c];
        }
    }

    // Ako nema direktnog poklapanja, trazi po SKU prefixu
    if (empty($matched)) {
        foreach ($imageFiles as $name => $filename) {
            if (str_starts_with($name, strtolower($sku)) || str_starts_with($name, strtolower($ean))) {
                $matched[] = $filename;
            }
        }
    }

    if (empty($matched)) {
        $notFound++;
        continue;
    }

    // Napravi zapise za catalog_product_media
    $records = [];
    foreach (array_slice($matched, 0, 10) as $i => $filename) {
        $records[] = [
            'legacy_product_id' => $legacyId,
            'url'               => IMAGE_BASE_URL . rawurlencode($filename),
            'sort'              => $i,
            'is_cover'          => $i === 0,
        ];
    }

    $code = sbPost($records);
    if ($code === 200 || $code === 201 || $code === 204) {
        $linked++;
    }
}

out('GOTOVO!');
out("Povezano: $linked | Nije nadjeno: $notFound");
out('Refresh shop da vidis slike!');
