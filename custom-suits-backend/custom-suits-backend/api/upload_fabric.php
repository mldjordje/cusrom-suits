<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS: allow localhost and production origins; fallback to '*'
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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';

if (!isset($_FILES['texture']) || $_FILES['texture']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "message" => "Greška pri uploadu slike."]);
    exit;
}

$name = trim($_POST['name'] ?? 'Bez naziva');
$uploadDir = '../uploads/fabrics/';

if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$filename = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', basename($_FILES['texture']['name']));
$targetPath = $uploadDir . $filename;

if (!move_uploaded_file($_FILES['texture']['tmp_name'], $targetPath)) {
    echo json_encode(["success" => false, "message" => "Neuspešno premeštanje fajla."]);
    exit;
}

$texturePath = 'uploads/fabrics/' . $filename;

// Prefer ImageMagick for luminance (alpha-masked); fallback to GD average
$avgBrightness = null;
$cmd = 'magick ' . escapeshellarg($targetPath) . ' -alpha on -colorspace gray ( +clone -alpha extract ) -compose multiply -composite -format "%[fx:mean]" info:';
@exec($cmd, $out, $ret);
if ($ret === 0 && isset($out[0]) && is_numeric($out[0])) {
    $avgBrightness = floatval($out[0]); // 0..1
} else {
    $img = @imagecreatefromstring(file_get_contents($targetPath));
    if ($img) {
        $width = imagesx($img);
        $height = imagesy($img);
        $totalBrightness = 0;
        $count = 0;
        for ($x = 0; $x < $width; $x += 10) {
            for ($y = 0; $y < $height; $y += 10) {
                $rgb = imagecolorat($img, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                $brightness = ($r + $g + $b) / (3 * 255);
                $totalBrightness += $brightness;
                $count++;
            }
        }
        imagedestroy($img);
        $avgBrightness = $count ? ($totalBrightness / $count) : 0.5;
    } else {
        $avgBrightness = 0.5;
    }
}

$tone = $avgBrightness < 0.28 ? "dark" : ($avgBrightness < 0.55 ? "medium" : "light");

$stmt = $pdo->prepare("INSERT INTO fabrics (name, texture_path, tone) VALUES (?, ?, ?)");
$stmt->execute([$name, $texturePath, $tone]);

echo json_encode([
    "success" => true,
    "message" => "Tkanina uspešno dodata!",
    "name" => $name,
    "tone" => $tone,
    "brightness" => $avgBrightness,
    "texture" => "https://customsuits.adspire.rs/" . $texturePath
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
