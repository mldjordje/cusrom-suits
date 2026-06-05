<?php
declare(strict_types=1);

const ENDPOINT_URL = 'https://custom-suits.vercel.app/api/cron/ananas';
const CRON_SECRET = 'PASTE_CRON_SECRET_HERE';
const LOG_FILE = __DIR__ . '/ananas-sync.log';

function write_log(string $message): void {
    file_put_contents(LOG_FILE, '[' . date('c') . '] ' . $message . PHP_EOL, FILE_APPEND);
}

if (CRON_SECRET === 'PASTE_CRON_SECRET_HERE' || CRON_SECRET === '') {
    write_log('CRON_SECRET is not configured.');
    exit(1);
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => ENDPOINT_URL,
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
    write_log('FAILED status=' . $status . ' error=' . $error . ' body=' . substr((string) $body, 0, 2000));
    exit(1);
}

write_log('OK status=' . $status . ' body=' . substr((string) $body, 0, 2000));
echo "OK\n";
