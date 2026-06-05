<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('memory_limit', '256M');
set_time_limit(600);

define('SUPABASE_URL', 'https://jmnuuekizaljlqdeupqr.supabase.co');
define('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I');

function sbGetAll(string $table, string $select): array {
    $all = [];
    $from = 0;
    $pageSize = 1000;
    while (true) {
        $to = $from + $pageSize - 1;
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => SUPABASE_URL . '/rest/v1/' . $table . '?select=' . $select,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_HTTPHEADER     => [
                'apikey: ' . SUPABASE_KEY,
                'Authorization: Bearer ' . SUPABASE_KEY,
                'Range-Unit: items',
                'Range: ' . $from . '-' . $to,
            ],
        ]);
        $res  = curl_exec($ch);
        curl_close($ch);
        $batch = json_decode($res, true) ?? [];
        $all = array_merge($all, $batch);
        if (count($batch) < $pageSize) break;
        $from += $pageSize;
    }
    return $all;
}

function sbGetMedia(array $ids): array {
    if (empty($ids)) return [];
    $param = implode(',', $ids);
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => SUPABASE_URL . '/rest/v1/catalog_product_media?legacy_product_id=in.(' . $param . ')&select=legacy_product_id,url,sort,is_cover&order=sort.asc',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . SUPABASE_KEY,
            'Authorization: Bearer ' . SUPABASE_KEY,
            'Range-Unit: items',
            'Range: 0-9999',
        ],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true) ?? [];
}

function sbPost(string $path, array $data): int {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => SUPABASE_URL . $path,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . SUPABASE_KEY,
            'Authorization: Bearer ' . SUPABASE_KEY,
            'Content-Type: application/json',
            'Prefer: resolution=ignore-duplicates,return=minimal',
        ],
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code;
}

function out(string $msg): void {
    echo '[' . date('H:i:s') . '] ' . $msg . '<br>';
    flush();
}

// ============================================================
// Korak 1: Ucitaj SVE proizvode, razdvoji mOffice od starih
// ============================================================
out('Korak 1: Ucitavam sve proizvode...');
$allProducts = sbGetAll('catalog_products', 'legacy_id,sku,raw_payload');
out('Ukupno proizvoda: ' . count($allProducts));

$mofficeProducts = []; // legacy_id -> sku
$oldBySku = [];        // sku -> [legacy_id, ...]

foreach ($allProducts as $row) {
    $legacyId = (int)($row['legacy_id'] ?? 0);
    $sku      = trim((string)($row['sku'] ?? ''));
    $payload  = $row['raw_payload'] ?? [];
    $source   = is_array($payload) ? ($payload['source'] ?? '') : '';

    if ($source === 'moffice') {
        $mofficeProducts[$legacyId] = $sku;
    } else {
        if ($sku) {
            $oldBySku[$sku][] = $legacyId;
        }
    }
}

out('mOffice artikala: ' . count($mofficeProducts));
out('Starih artikala sa SKU: ' . count($oldBySku));

// ============================================================
// Korak 2: Za svaki mOffice artikal nadji stari sa istim SKU
// ============================================================
out('Korak 2: Trazim poklapanja po SKU...');

$pairs = []; // mofficeId -> [oldId, ...]
foreach ($mofficeProducts as $mofficeId => $sku) {
    if ($sku && isset($oldBySku[$sku])) {
        $pairs[$mofficeId] = $oldBySku[$sku];
    }
}
out('Poklapanja: ' . count($pairs));

if (empty($pairs)) {
    out('Nema poklapanja po SKU — proveriti da li se SKU-ovi poklapaju!');
    // Debug: prikazi prvih 10 mOffice SKU-ova i prvih 10 starih SKU-ova
    $mSkus = array_slice(array_values($mofficeProducts), 0, 10);
    $oSkus = array_slice(array_keys($oldBySku), 0, 10);
    out('Primeri mOffice SKU: ' . implode(', ', $mSkus));
    out('Primeri starih SKU: ' . implode(', ', $oSkus));
    exit;
}

// ============================================================
// Korak 3: Kopiraj slike u batchevima
// ============================================================
out('Korak 3: Kopiram slike...');

$mofficeIds   = array_keys($pairs);
$allOldIds    = array_unique(array_merge(...array_values($pairs)));
$mediaByOldId = [];

// Ucitaj sve slike za stare artikle u batchevima po 100
foreach (array_chunk($allOldIds, 100) as $chunk) {
    $media = sbGetMedia($chunk);
    foreach ($media as $img) {
        $pid = (int)($img['legacy_product_id'] ?? 0);
        if (!$pid) continue;
        $mediaByOldId[$pid][] = $img;
    }
}
out('Starih artikala sa slikama: ' . count($mediaByOldId));

$copied  = 0;
$skipped = 0;
$errors  = 0;

foreach ($pairs as $mofficeId => $oldIds) {
    $records = [];
    foreach ($oldIds as $oldId) {
        foreach ($mediaByOldId[$oldId] ?? [] as $img) {
            $url = trim((string)($img['url'] ?? ''));
            if (!$url) continue;
            $records[] = [
                'legacy_product_id' => $mofficeId,
                'url'               => $url,
                'sort'              => (int)($img['sort'] ?? 0),
                'is_cover'          => (bool)($img['is_cover'] ?? false),
            ];
        }
    }

    if (empty($records)) { $skipped++; continue; }

    // Deduplikuj URL-ove
    $seen = [];
    $unique = [];
    foreach ($records as $r) {
        if (!isset($seen[$r['url']])) {
            $seen[$r['url']] = true;
            $unique[] = $r;
        }
    }

    $code = sbPost('/rest/v1/catalog_product_media', $unique);
    if ($code === 200 || $code === 201 || $code === 204) {
        $copied++;
    } else {
        out("GRESKA mOffice ID $mofficeId — HTTP $code");
        $errors++;
    }
}

out('GOTOVO!');
out("Kopiranih: $copied | Bez slika: $skipped | Gresaka: $errors");
