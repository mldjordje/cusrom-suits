<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('memory_limit', '512M');
set_time_limit(600);

/**
 * mOffice -> Supabase stock sync
 *
 * mOffice is treated as a stock/price source, not as the source of product
 * identity. When an item with the same EAN/SKU already exists in Santos, this
 * script updates that existing legacy_id so existing images stay connected.
 */

define('MOFFICE_API_URL', 'https://api.moffice.co.rs/api/LagerTekstil');
define('MOFFICE_API_KEY', '423E7991-1756-4784-AA64-DA8EE4F36E30');

define('SUPABASE_URL', 'https://jmnuuekizaljlqdeupqr.supabase.co');
define('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I');
define('SUPABASE_TABLE', 'catalog_products');
define('LOG_FILE', __DIR__ . '/moffice-sync.log');
define('SYNC_RUNS_TABLE', 'integration_sync_runs');

function logMsg(string $msg): void {
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents(LOG_FILE, $line, FILE_APPEND);
    echo $line;
    flush();
}

function generateUuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function startSyncRun(): ?string {
    $id = generateUuid();
    $now = date('c');
    $result = supabaseRequest('POST', '/rest/v1/' . SYNC_RUNS_TABLE, [
        'id' => $id,
        'domain' => 'stock_inbound',
        'status' => 'running',
        'environment' => 'production',
        'mode' => 'full',
        'trigger' => 'cron',
        'started_at' => $now,
        'finished_at' => null,
        'duration_ms' => null,
        'counters' => ['total' => 0, 'success' => 0, 'failed' => 0, 'skipped' => 0],
        'summary' => null,
        'meta' => ['source' => 'moffice-sync.php'],
    ], ['Prefer: return=minimal']);

    if ($result['error'] || !in_array($result['code'], [200, 201, 204], true)) {
        logMsg("Warning: could not create sync run record HTTP {$result['code']} | {$result['error']} | {$result['body']}");
        return null;
    }
    return $id;
}

function completeSyncRun(?string $runId, string $status, float $startTime, array $counters, string $summary): void {
    if ($runId === null) {
        return;
    }
    $finishedAt = date('c');
    $durationMs = (int)((microtime(true) - $startTime) * 1000);
    $result = supabaseRequest('PATCH', '/rest/v1/' . SYNC_RUNS_TABLE . '?id=eq.' . urlencode($runId), [
        'status' => $status,
        'finished_at' => $finishedAt,
        'duration_ms' => $durationMs,
        'counters' => $counters,
        'summary' => $summary,
    ], ['Prefer: return=minimal']);

    if ($result['error'] || !in_array($result['code'], [200, 201, 204], true)) {
        logMsg("Warning: could not complete sync run record HTTP {$result['code']} | {$result['error']}");
    }
}

function cleanName(string $name): string {
    $parts = preg_split('/\s{2,}/', trim($name));
    return trim($parts[0] ?? $name);
}

function normalizeKey($value): string {
    return trim((string)$value);
}

function supabaseRequest(string $method, string $path, ?array $payload = null, array $headers = []): array {
    $ch = curl_init();
    $baseHeaders = [
        'apikey: ' . SUPABASE_KEY,
        'Authorization: Bearer ' . SUPABASE_KEY,
        'Content-Type: application/json',
    ];

    curl_setopt_array($ch, [
        CURLOPT_URL => SUPABASE_URL . $path,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge($baseHeaders, $headers),
        CURLOPT_TIMEOUT => 60,
    ]);

    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['code' => $code, 'body' => $body, 'error' => $error];
}

function fetchAllCatalogProducts(): array {
    $all = [];
    $from = 0;
    $pageSize = 1000;

    while (true) {
        $to = $from + $pageSize - 1;
        $result = supabaseRequest(
            'GET',
            '/rest/v1/' . SUPABASE_TABLE . '?select=legacy_id,sku,ean,name_sr,raw_payload',
            null,
            ['Range-Unit: items', 'Range: ' . $from . '-' . $to]
        );

        if ($result['error'] || $result['code'] < 200 || $result['code'] >= 300) {
            logMsg("Supabase catalog error HTTP {$result['code']} | {$result['error']} | {$result['body']}");
            exit(1);
        }

        $batch = json_decode((string)$result['body'], true);
        if (!is_array($batch)) {
            logMsg('Supabase catalog did not return valid JSON');
            exit(1);
        }

        $all = array_merge($all, $batch);
        if (count($batch) < $pageSize) {
            break;
        }
        $from += $pageSize;
    }

    return $all;
}

function fetchMofficeItems(): array {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => MOFFICE_API_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => ['X-API-KEY: ' . MOFFICE_API_KEY],
    ]);

    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error || $code !== 200) {
        logMsg("mOffice API error HTTP $code | $error");
        exit(1);
    }

    $items = json_decode((string)$raw, true);
    if (!is_array($items)) {
        logMsg('mOffice did not return valid JSON');
        exit(1);
    }

    return $items;
}

function upsertRows(array $rows): int {
    $total = 0;
    foreach (array_chunk($rows, 100) as $i => $batch) {
        $result = supabaseRequest(
            'POST',
            '/rest/v1/' . SUPABASE_TABLE . '?on_conflict=legacy_id',
            $batch,
            ['Prefer: resolution=merge-duplicates,return=minimal']
        );

        if ($result['error'] || !in_array($result['code'], [200, 201, 204], true)) {
            logMsg("Upsert batch $i error HTTP {$result['code']} | {$result['error']} | {$result['body']}");
            continue;
        }

        $total += count($batch);
        logMsg('Upsert batch ' . $i . ' OK: ' . count($batch));
    }

    return $total;
}

function disableMofficeDuplicates(array $legacyIds): void {
    $legacyIds = array_values(array_unique(array_filter(array_map('intval', $legacyIds))));
    foreach (array_chunk($legacyIds, 100) as $i => $ids) {
        $result = supabaseRequest(
            'PATCH',
            '/rest/v1/' . SUPABASE_TABLE . '?legacy_id=in.(' . implode(',', $ids) . ')&raw_payload->>source=eq.moffice',
            ['is_active' => false, 'is_exported' => false, 'updated_at' => date('c')]
        );

        if ($result['error'] || !in_array($result['code'], [200, 204], true)) {
            logMsg("Disable duplicate batch $i error HTTP {$result['code']} | {$result['error']} | {$result['body']}");
            continue;
        }

        logMsg('Disabled duplicate batch ' . $i . ': ' . count($ids));
    }
}

logMsg('START sync');

$syncStartTime = microtime(true);
$runId = startSyncRun();

try {
    $mofficeItems = fetchMofficeItems();
    logMsg('mOffice returned ' . count($mofficeItems) . ' items');

    $existingProducts = fetchAllCatalogProducts();
    $byEan = [];
    $bySku = [];

    foreach ($existingProducts as $product) {
        $payload = $product['raw_payload'] ?? [];
        $source = is_array($payload) ? (string)($payload['source'] ?? '') : '';
        if ($source === 'moffice') {
            continue;
        }

        $legacyId = (int)($product['legacy_id'] ?? 0);
        if (!$legacyId) {
            continue;
        }

        $ean = normalizeKey($product['ean'] ?? '');
        $sku = normalizeKey($product['sku'] ?? '');
        if ($ean !== '' && !isset($byEan[$ean])) {
            $byEan[$ean] = $product;
        }
        if ($sku !== '' && !isset($bySku[$sku])) {
            $bySku[$sku] = $product;
        }
    }

    logMsg('Loaded existing Santos products: ' . count($existingProducts));

    $rowsByLegacyId = [];
    $duplicatesToDisable = [];
    $matchedExisting = 0;
    $createdNew = 0;

    foreach ($mofficeItems as $item) {
        $mofficeId = (int)($item['ARTIKAL_ID'] ?? 0);
        if (!$mofficeId) {
            continue;
        }

        $sku = normalizeKey($item['ARTIKAL_SIFRA'] ?? '');
        $ean = normalizeKey($item['ARTIKAL_BARKOD'] ?? '');
        $existing = ($ean !== '' && isset($byEan[$ean])) ? $byEan[$ean] : (($sku !== '' && isset($bySku[$sku])) ? $bySku[$sku] : null);

        $name = cleanName((string)($item['ARTIKAL_NAZIV'] ?? ''));
        $mpPrice = (float)($item['ARTIKAL_MP_CENA'] ?? 0);
        $vpPrice = (float)($item['ARTIKAL_VP_CENA'] ?? 0);
        $tax = (float)($item['ARTIKAL_PDV_STOPA'] ?? 20);
        $stock = max(0, (int)($item['ARTIKAL_ZALIHE'] ?? 0));
        $legacyId = $existing ? (int)$existing['legacy_id'] : $mofficeId;

        $payload = $existing && is_array($existing['raw_payload'] ?? null) ? $existing['raw_payload'] : [];
        $commerceOverrides = is_array($payload['commerceOverrides'] ?? null) ? $payload['commerceOverrides'] : [];
        $keepManualPrice = ($commerceOverrides['price'] ?? false) === true;
        $payload['moffice'] = [
            'id' => $mofficeId,
            'category' => $item['ARTIKAL_GRUPA'] ?? '',
            'size' => $item['ARTIKAL_VELICINA'] ?? '',
            'synced_at' => date('c'),
        ];

        if ($existing) {
            $matchedExisting++;
            if ($mofficeId !== $legacyId) {
                $duplicatesToDisable[] = $mofficeId;
            }
        } else {
            $createdNew++;
            $payload['source'] = 'moffice';
            $payload['category'] = $item['ARTIKAL_GRUPA'] ?? '';
            $payload['size'] = $item['ARTIKAL_VELICINA'] ?? '';
        }

        $rowsByLegacyId[$legacyId] = [
            'legacy_id' => $legacyId,
            'sku' => $sku,
            'ean' => $ean,
            'name_sr' => $existing ? (string)($existing['name_sr'] ?? $name) : $name,
            'tax_percent' => $tax,
            'stock_warehouse_1' => $stock,
            'stock_total' => $stock,
            'is_active' => $stock > 0,
            'is_exported' => true,
            'raw_payload' => $payload,
            'updated_at' => date('c'),
        ];

        if (!$keepManualPrice) {
            $rowsByLegacyId[$legacyId]['price_net'] = round($vpPrice, 2);
            $rowsByLegacyId[$legacyId]['price_gross'] = round($mpPrice, 2);
            $rowsByLegacyId[$legacyId]['price_final_gross'] = round($mpPrice, 2);
            $rowsByLegacyId[$legacyId]['rebate_percent'] = 0;
        }
    }

    $rows = array_values($rowsByLegacyId);
    logMsg("Mapped $matchedExisting items to existing Santos products");
    logMsg("Created $createdNew new mOffice-only products");
    logMsg('Unique rows to upsert: ' . count($rows));

    disableMofficeDuplicates($duplicatesToDisable);
    $total = upsertRows($rows);

    $summary = "Synced $total products ($matchedExisting matched, $createdNew new)";
    logMsg("DONE - $summary");

    completeSyncRun($runId, 'success', $syncStartTime, [
        'total' => count($mofficeItems),
        'success' => $total,
        'failed' => 0,
        'skipped' => count($mofficeItems) - $total,
    ], $summary);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    logMsg("FATAL ERROR: $msg");
    completeSyncRun($runId, 'failed', $syncStartTime, [
        'total' => 0,
        'success' => 0,
        'failed' => 1,
        'skipped' => 0,
    ], "Fatal error: $msg");
    exit(1);
}
