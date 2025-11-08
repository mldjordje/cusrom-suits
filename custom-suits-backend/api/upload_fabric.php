<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

require_once '../config/database.php';

if (!isset($_FILES['texture']) || $_FILES['texture']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "message" => "Texture file missing or invalid upload"]);
    exit;
}

$mimeMap = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/webp' => 'webp',
];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES['texture']['tmp_name']);
if (!isset($mimeMap[$mime])) {
    echo json_encode(["success" => false, "message" => "Unsupported image type"]);
    exit;
}

$name = trim($_POST['name'] ?? 'Untitled fabric');
$uploadDir = '../uploads/fabrics/';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
    echo json_encode(["success" => false, "message" => "Failed to prepare upload directory"]);
    exit;
}

$safeBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($_FILES['texture']['name'], PATHINFO_FILENAME));
$filename = time() . '_' . ($safeBase ?: 'fabric') . '.' . $mimeMap[$mime];
$targetPath = $uploadDir . $filename;

if (!move_uploaded_file($_FILES['texture']['tmp_name'], $targetPath)) {
    echo json_encode(["success" => false, "message" => "Unable to store uploaded image"]);
    exit;
}

$avgBrightness = 0.5;
$toneAlgo = 'gd';

if (extension_loaded('imagick')) {
    try {
        $imagick = new Imagick($targetPath);
        $imagick->setImageColorspace(Imagick::COLORSPACE_RGB);
        $imagick->stripImage();
        if ($imagick->getImageWidth() > 320) {
            $imagick->resizeImage(320, 320, Imagick::FILTER_LANCZOS, 0.8, true);
        }
        $iterator = $imagick->getPixelIterator();
        $sum = 0.0;
        $count = 0;
        foreach ($iterator as $row) {
            foreach ($row as $pixel) {
                $alpha = 1.0 - $pixel->getColorValue(Imagick::COLOR_ALPHA);
                if ($alpha < 0.05) {
                    continue;
                }
                $sum += (
                    $pixel->getColorValue(Imagick::COLOR_RED) +
                    $pixel->getColorValue(Imagick::COLOR_GREEN) +
                    $pixel->getColorValue(Imagick::COLOR_BLUE)
                ) / 3.0;
                $count++;
            }
        }
        if ($count > 0) {
            $avgBrightness = $sum / $count;
            $toneAlgo = 'imagick';
        }
        $imagick->clear();
        $imagick->destroy();
    } catch (Throwable $e) {
        // Fall back to GD below
    }
}

if ($toneAlgo !== 'imagick') {
    $img = @imagecreatefromstring(file_get_contents($targetPath));
    if ($img) {
        $width = imagesx($img);
        $height = imagesy($img);
        $stepX = max(1, (int) floor($width / 200));
        $stepY = max(1, (int) floor($height / 200));
        $total = 0.0;
        $count = 0;
        for ($x = 0; $x < $width; $x += $stepX) {
            for ($y = 0; $y < $height; $y += $stepY) {
                $rgba = imagecolorat($img, $x, $y);
                $r = ($rgba >> 16) & 0xFF;
                $g = ($rgba >> 8) & 0xFF;
                $b = $rgba & 0xFF;
                $total += ($r + $g + $b) / (3 * 255);
                $count++;
            }
        }
        imagedestroy($img);
        if ($count > 0) {
            $avgBrightness = $total / $count;
        }
    }
}

$tone = $avgBrightness < 0.28 ? 'dark' : ($avgBrightness < 0.55 ? 'medium' : 'light');
$texturePath = 'uploads/fabrics/' . $filename;

$stmt = $pdo->prepare("INSERT INTO fabrics (name, texture_path, tone) VALUES (?, ?, ?)");
$stmt->execute([$name, $texturePath, $tone]);

echo json_encode([
    "success" => true,
    "message" => "Fabric stored",
    "name" => $name,
    "tone" => $tone,
    "brightness" => round($avgBrightness, 4),
    "algorithm" => $toneAlgo,
    "texture" => "https://customsuits.adspire.rs/" . $texturePath
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
