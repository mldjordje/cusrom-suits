<?php
declare(strict_types=1);

// Allow production + preview origins (including localhost for local QA)
$allowed_origins = [
    'https://custom-suits.vercel.app',
    'https://customsuits.adspire.rs',
    'https://www.customsuits.adspire.rs',
    'http://localhost:3000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../config/database.php';

$tone = strtolower(trim($_GET['tone'] ?? ''));
$allowedTones = ['light', 'medium', 'dark'];
$toneFilter = in_array($tone, $allowedTones, true) ? $tone : null;

$search = trim($_GET['search'] ?? '');

$sort = strtolower($_GET['sort'] ?? 'created_at');
$sortMap = [
    'name' => 'name',
    'tone' => 'tone',
    'created_at' => 'created_at',
    'id' => 'id',
];
$sortColumn = $sortMap[$sort] ?? 'created_at';

$order = strtolower($_GET['order'] ?? 'desc');
$orderDirection = $order === 'asc' ? 'ASC' : 'DESC';

$limit = isset($_GET['limit']) ? max(10, min(500, (int) $_GET['limit'])) : 250;

$conditions = [];
$params = [];
if ($toneFilter) {
    $conditions[] = 'tone = :tone';
    $params[':tone'] = $toneFilter;
}
if ($search !== '') {
    $conditions[] = '(name LIKE :search OR CAST(id AS CHAR) LIKE :search)';
    $params[':search'] = '%' . $search . '%';
}

$sql = "
    SELECT
        id,
        name,
        tone,
        created_at,
        CONCAT('https://customsuits.adspire.rs/uploads/fabrics/', SUBSTRING_INDEX(texture_path, '/', -1)) AS texture
    FROM fabrics
";

if ($conditions) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}

$sql .= " ORDER BY {$sortColumn} {$orderDirection} LIMIT {$limit}";

try {
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $stmt->execute();
    $fabrics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'filters' => [
            'tone' => $toneFilter,
            'search' => $search !== '' ? $search : null,
            'sort' => $sortColumn,
            'order' => $orderDirection,
            'limit' => $limit,
        ],
        'count' => count($fabrics),
        'data' => $fabrics,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
?>
