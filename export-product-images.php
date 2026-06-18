<?php
/**
 * Export product_file slike iz starog MySQL
 * Postavi na: assets.santos.rs/export-product-images.php
 * Pristup: https://assets.santos.rs/export-product-images.php?token=santos2026export
 *
 * Vrati JSON: [{productid, content, sort, type}, ...]
 */

ini_set('max_execution_time', 0);
ini_set('memory_limit', '256M');
header('Content-Type: application/json; charset=utf-8');

$TOKEN = 'santos2026export';
if (($_GET['token'] ?? '') !== $TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$dbname     = 'agyc3416_santos_sa2025';
$servername = 'mysql';
$user       = 'agyc3416_user2025';
$password   = 'HcDIH(k*VtbI';

$conn = mysqli_connect($servername, $user, $password, $dbname);
if (!$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connect failed: ' . mysqli_connect_error()]);
    exit;
}
mysqli_set_charset($conn, 'utf8');

// Uzmi sve slike iz product_file (type=img), sortirane po productid i sort
$q = "SELECT productid, content, sort, type
      FROM product_file
      WHERE type = 'img'
      ORDER BY productid ASC, sort ASC";

$res = mysqli_query($conn, $q);
if (!$res) {
    http_response_code(500);
    echo json_encode(['error' => mysqli_error($conn)]);
    exit;
}

$rows = [];
while ($row = mysqli_fetch_assoc($res)) {
    $rows[] = [
        'productid' => (int)$row['productid'],
        'content'   => $row['content'],
        'sort'      => (int)$row['sort'],
    ];
}

mysqli_close($conn);

echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
