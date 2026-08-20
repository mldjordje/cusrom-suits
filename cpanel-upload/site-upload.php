<?php
/**
 * Santos & Santorini — cPanel upload endpoint
 * Place this file at: public_html/site-upload.php
 * Access via: https://assets.santos.rs/site-upload.php
 *
 * Token: postavi UPLOAD_SECRET kao env var (cPanel -> MultiPHP INI Editor, ili
 * SetEnv UPLOAD_SECRET <token> u public_html/.htaccess). Mora biti identican
 * PHP_UPLOAD_TOKEN-u na Vercelu.
 *
 * Dva nacina autorizacije:
 *   1) X-Upload-Token header  — koristi ga server (Vercel funkcija).
 *   2) ?exp=<unix>&sig=<hmac> — potpis koji izda Vercel, a fajl salje sam
 *      browser. Tako veliki fajlovi (hero video) ne prolaze kroz Vercel, gde
 *      telo zahteva puca na ~4.5MB. Token nikad ne napusta server.
 *
 * Za velike fajlove podigni i PHP limite (public_html/.htaccess):
 *   php_value post_max_size 256M
 *   php_value upload_max_filesize 256M
 *   php_value max_execution_time 300
 */

$ALLOWED_ORIGINS = [
    'https://www.santos.rs',
    'https://santos.rs',
    'http://localhost:3000',
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin !== '' && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Max-Age: 600');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Token se cita iz okruzenja, a ako env var nije dostupan (cest slucaj na
// PHP-FPM hostingu) upisi ga direktno u $fallbackSecret ispod.
//
// NIKAD ne ostavljaj placeholder vrednost: dok je ona tu, endpoint odbija sve
// zahteve. Ranije je fallback bio javno poznat string iz repoa, sto je znacilo
// da svako moze da uploaduje fajlove na asset host.
$fallbackSecret = 'PROMENI-ME-novi-token-ovde';

$secret = getenv('UPLOAD_SECRET');
if ($secret === false || $secret === '') {
    $secret = $fallbackSecret;
}

if ($secret === '' || $secret === 'PROMENI-ME-novi-token-ovde' || $secret === 'REPLACE_THIS_WITH_YOUR_SECRET_TOKEN') {
    http_response_code(500);
    echo json_encode(['error' => 'Upload secret not configured on the server']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$subdir   = isset($_GET['subdir'])   ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['subdir'])   : '';
$filename = isset($_GET['filename']) ? preg_replace('/[^a-zA-Z0-9._\-]/', '', $_GET['filename']) : '';

if (!$subdir || !$filename) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing subdir or filename query params']);
    exit;
}

$token = isset($_SERVER['HTTP_X_UPLOAD_TOKEN']) ? $_SERVER['HTTP_X_UPLOAD_TOKEN'] : '';
$exp   = isset($_GET['exp']) ? (int) $_GET['exp'] : 0;
$sig   = isset($_GET['sig']) ? (string) $_GET['sig'] : '';

$authorized = false;

if (is_string($token) && $token !== '' && hash_equals($secret, $token)) {
    $authorized = true;
} elseif ($sig !== '' && $exp > 0) {
    // Potpis vazi samo za tacno ovaj subdir + filename i samo do isteka.
    if ($exp >= time()) {
        $expected = hash_hmac('sha256', $subdir . '|' . $filename . '|' . $exp, $secret);
        $authorized = hash_equals($expected, $sig);
    }
}

if (!$authorized) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Odbij sve sto lici na putanju ili na skriveni fajl.
if (strpos($filename, '..') !== false || $filename[0] === '.') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid filename']);
    exit;
}

// Whitelist ekstenzija. Bez ovoga je token = RCE: .php upload pa poziv.
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'ico', 'mp4', 'webm', 'mov', 'pdf'];
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if ($ext === '' || !in_array($ext, $allowed, true)) {
    http_response_code(415);
    echo json_encode(['error' => 'Extension not allowed']);
    exit;
}

// Odbij dvostruke ekstenzije tipa slika.php.jpg
if (preg_match('/\.(php[0-9]?|phtml|phar|pht|cgi|pl|py|sh|htaccess)\./i', $filename)) {
    http_response_code(415);
    echo json_encode(['error' => 'Invalid filename']);
    exit;
}

$dir = __DIR__ . '/fajlovi/site-assets/' . $subdir . '/';
if (!is_dir($dir)) {
    if (!mkdir($dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not create directory']);
        exit;
    }
}

// Poslednja provera: rezultujuca putanja mora ostati unutar fajlovi/site-assets.
$base = realpath(__DIR__ . '/fajlovi/site-assets');
$real = realpath($dir);
if ($base === false || $real === false || strpos($real, $base) !== 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$destPath = $dir . $filename;

// 200 MB gornja granica. Telo se prepisuje u komadima da veliki video ne
// zavrsi ceo u memoriji PHP procesa.
$maxBytes = 209715200;
$in  = fopen('php://input', 'rb');
$out = fopen($destPath, 'wb');

if ($in === false || $out === false) {
    if ($in !== false) fclose($in);
    if ($out !== false) fclose($out);
    http_response_code(500);
    echo json_encode(['error' => 'Could not open stream']);
    exit;
}

$written = 0;
while (!feof($in)) {
    $chunk = fread($in, 1048576);
    if ($chunk === false) break;
    $written += strlen($chunk);
    if ($written > $maxBytes) {
        fclose($in);
        fclose($out);
        @unlink($destPath);
        http_response_code(413);
        echo json_encode(['error' => 'File too large']);
        exit;
    }
    if ($chunk !== '' && fwrite($out, $chunk) === false) {
        fclose($in);
        fclose($out);
        @unlink($destPath);
        http_response_code(500);
        echo json_encode(['error' => 'Could not write file']);
        exit;
    }
}

fclose($in);
fclose($out);

if ($written === 0) {
    @unlink($destPath);
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit;
}

chmod($destPath, 0644);

echo json_encode([
    'url' => '/fajlovi/site-assets/' . $subdir . '/' . $filename,
]);
