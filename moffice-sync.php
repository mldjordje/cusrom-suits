<?php
declare(strict_types=1);

/**
 * cPanel mOffice bridge for Santos stock sync.
 *
 * mOffice appears to allow only the cPanel hosting IP, so this script fetches
 * LagerTekstil from cPanel and posts the raw feed to Next.js. Business logic
 * still lives in Next.js at /api/cron/moffice.
 */

const ENDPOINT_URL = 'https://santos.rs/api/cron/moffice';
const MOFFICE_API_URL = 'https://api.moffice.co.rs/api/LagerTekstil';
const CRON_SECRET = 'PASTE_CRON_SECRET_HERE';
const MOFFICE_API_KEY = 'PASTE_MOFFICE_API_KEY_HERE';
const LOG_FILE = __DIR__ . '/moffice-sync.log';

function write_log(string $message): void {
    file_put_contents(LOG_FILE, '[' . date('c') . '] ' . $message . PHP_EOL, FILE_APPEND);
}

if (CRON_SECRET === 'PASTE_CRON_SECRET_HERE' || CRON_SECRET === '') {
    write_log('CRON_SECRET is not configured.');
    exit(1);
}

if (MOFFICE_API_KEY === 'PASTE_MOFFICE_API_KEY_HERE' || MOFFICE_API_KEY === '') {
    write_log('MOFFICE_API_KEY is not configured.');
    exit(1);
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => MOFFICE_API_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 900,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'X-API-KEY: ' . MOFFICE_API_KEY,
        'Accept: application/json',
    ],
]);

$mofficeBody = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error !== '' || $status < 200 || $status >= 300) {
    write_log('MOFFICE FAILED status=' . $status . ' error=' . $error . ' body=' . substr((string) $mofficeBody, 0, 2000));
    exit(1);
}

$items = json_decode((string) $mofficeBody, true);
if (!is_array($items)) {
    write_log('MOFFICE FAILED invalid JSON body=' . substr((string) $mofficeBody, 0, 2000));
    exit(1);
}

$payload = json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
if ($payload === false) {
    write_log('MOFFICE FAILED could not encode payload: ' . json_last_error_msg());
    exit(1);
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => ENDPOINT_URL,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 900,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . CRON_SECRET,
        'Content-Type: application/json',
    ],
]);

$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error !== '' || $status < 200 || $status >= 300) {
    write_log('SANTOS FAILED status=' . $status . ' error=' . $error . ' body=' . substr((string) $body, 0, 2000));
    exit(1);
}

write_log('OK status=' . $status . ' body=' . substr((string) $body, 0, 2000));
echo "OK\n";
