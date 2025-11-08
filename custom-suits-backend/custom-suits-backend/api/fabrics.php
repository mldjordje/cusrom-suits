<?php
// CORS: allow localhost for dev and production origins; fallback to '*'
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://custom-suits.vercel.app',
    'https://customsuits.adspire.rs'
];
if ($origin && in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';

try {
    // Filters: tone=light|medium|dark, order=asc|desc (by created_at)
    $tone = isset($_GET['tone']) ? strtolower(trim($_GET['tone'])) : null;
    if (!in_array($tone, ['light','medium','dark'], true)) $tone = null;
    $order = isset($_GET['order']) && strtolower($_GET['order']) === 'asc' ? 'ASC' : 'DESC';

    $sql = "SELECT id, name, CONCAT('https://customsuits.adspire.rs/uploads/fabrics/', SUBSTRING_INDEX(texture_path, '/', -1)) AS texture, tone, created_at FROM fabrics";
    $conds = [];
    $params = [];
    if ($tone) { $conds[] = 'tone = ?'; $params[] = $tone; }
    if ($conds) { $sql .= ' WHERE ' . implode(' AND ', $conds); }
    $sql .= " ORDER BY created_at $order";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $fabrics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $fabrics
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
