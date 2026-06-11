<?php
/**
 * Santos & Santorini — cPanel upload endpoint
 * Place this file at: public_html/site-upload.php
 * Access via: https://assets.santos.rs/site-upload.php
 *
 * Required env var on the server (set in cPanel → Software → MultiPHP INI Editor
 * or add to public_html/.htaccess with SetEnv UPLOAD_SECRET yourtoken):
 *   UPLOAD_SECRET=<same value as PHP_UPLOAD_TOKEN on Vercel>
 */

header('Content-Type: application/json');

// *** Set this to any strong random string. Use the same value for PHP_UPLOAD_TOKEN on Vercel. ***
$secret = 'REPLACE_THIS_WITH_YOUR_SECRET_TOKEN';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$token = isset($_SERVER['HTTP_X_UPLOAD_TOKEN']) ? $_SERVER['HTTP_X_UPLOAD_TOKEN'] : '';
if (!hash_equals($secret, $token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$subdir   = isset($_GET['subdir'])   ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['subdir'])   : '';
$filename = isset($_GET['filename']) ? preg_replace('/[^a-zA-Z0-9._\-]/', '', $_GET['filename']) : '';

if (!$subdir || !$filename) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing subdir or filename query params']);
    exit;
}

$body = file_get_contents('php://input');
if ($body === false || strlen($body) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
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

$destPath = $dir . $filename;
if (file_put_contents($destPath, $body) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not write file']);
    exit;
}
chmod($destPath, 0644);

echo json_encode([
    'url' => '/fajlovi/site-assets/' . $subdir . '/' . $filename,
]);
