<?php
/**
 * 🔹 Auto-generate realistic shading maps from transparent layers
 * Place this file in: /uploads/generate_shading.php
 * It reads all .webp files from /uploads/transparent/
 * and generates /uploads/shading/*.webp (grayscale with alpha)
 */

$srcDir = __DIR__ . '/transparent';
$outDir = __DIR__ . '/shading';

// Ensure output directory exists
if (!file_exists($outDir)) {
    mkdir($outDir, 0775, true);
}

$files = glob("$srcDir/*.webp");
$total = count($files);

if ($total === 0) {
    exit("⚠️ Nema fajlova u transparent folderu.\n");
}

foreach ($files as $file) {
    $base = basename($file);
    $src = imagecreatefromwebp($file);
    imagesavealpha($src, true);

    $w = imagesx($src);
    $h = imagesy($src);
    $out = imagecreatetruecolor($w, $h);

    imagealphablending($out, false);
    imagesavealpha($out, true);
    $transparent = imagecolorallocatealpha($out, 0, 0, 0, 127);
    imagefill($out, 0, 0, $transparent);

    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $rgba = imagecolorat($src, $x, $y);
            $alpha = ($rgba & 0x7F000000) >> 24;

            // Ako piksel pripada odelu (nije providan)
            if ($alpha < 120) {
                // Sredi vertikalni gradijent senke
                $gradient = (int)(40 + ($y / $h) * 130); // tamnije dole
                // Blago nasumična tekstura za realnost
                $noise = rand(-10, 10);
                $shade = max(0, min(255, $gradient + $noise));
                $color = imagecolorallocatealpha($out, $shade, $shade, $shade, 0);
                imagesetpixel($out, $x, $y, $color);
            }
        }
    }

    imagewebp($out, "$outDir/$base", 95);
    imagedestroy($src);
    imagedestroy($out);
}

echo "✅ Generisano $total shading slika u '$outDir'. Sve spremno za SuitPreview.";
?>
