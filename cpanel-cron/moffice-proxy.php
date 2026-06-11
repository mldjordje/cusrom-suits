<?php
declare(strict_types=1);

/**
 * mOffice data proxy — triggered by Vercel admin panel to bypass IP whitelist.
 *
 * Place this file at public_html/cpanel-cron/moffice-proxy.php on the cPanel server.
 * Vercel calls it with Authorization header, it fetches mOffice (whitelisted IP),
 * and returns the raw JSON array to Vercel for local processing.
 *
 * Set on Vercel:
 *   MOFFICE_PROXY_URL  = https://assets.santos.rs/cpanel-cron/moffice-proxy.php
 *   MOFFICE_PROXY_SECRET = (same value as PROXY_SECRET constant below)
 */

const MOFFICE_API_URL = 'https://api.moffice.co.rs/api/LagerTekstil';
const MOFFICE_API_KEY  = '423E7991-1756-4784-AA64-DA8EE4F36E30';
const PROXY_SECRET     = 'santos-cron-2026-secure-xyz';

header('Content-Type: application/json; charset=utf-8');

// Auth check — accept Bearer token or X-Proxy-Secret header
$authHeader   = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$secretHeader = $_SERVER['HTTP_X_PROXY_SECRET'] ?? '';

if ($authHeader !== 'Bearer ' . PROXY_SECRET && $secretHeader !== PROXY_SECRET) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => MOFFICE_API_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER     => [
        'X-API-KEY: ' . MOFFICE_API_KEY,
        'Accept: application/json',
    ],
]);

$body   = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error  = curl_error($ch);
curl_close($ch);

if ($body === false || $error !== '') {
    http_response_code(502);
    echo json_encode(['error' => 'cURL failed', 'detail' => $error]);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['error' => 'mOffice returned ' . $status]);
    exit;
}

// Forward raw mOffice response directly to Vercel
echo $body;
