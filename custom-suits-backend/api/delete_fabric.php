<?php
header("Access-Control-Allow-Origin: https://custom-suits.vercel.app");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once '../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? intval($input['id']) : 0;
if (!$id) { echo json_encode([ 'success' => false, 'error' => 'Invalid id' ]); exit; }

try {
    // Find texture file
    $stmt = $pdo->prepare('SELECT texture_path FROM fabrics WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) { echo json_encode(['success'=>false,'error'=>'Not found']); exit; }

    // Attempt to delete file (best-effort)
    $path = realpath(__DIR__ . '/../' . $row['texture_path']);
    if ($path && strpos($path, realpath(__DIR__ . '/..')) === 0 && file_exists($path)) {
        @unlink($path);
    }

    // Delete record
    $del = $pdo->prepare('DELETE FROM fabrics WHERE id = ?');
    $del->execute([$id]);

    echo json_encode([ 'success' => true ]);
} catch (PDOException $e) {
    echo json_encode([ 'success' => false, 'error' => $e->getMessage() ]);
}
?>

