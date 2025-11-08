<?php
$dir = __DIR__ . "/uploads/shading";
$files = glob("$dir/*.webp");

foreach ($files as $file) {
    $img = imagecreatefromwebp($file);
    imagesavealpha($img, true);
    $w = imagesx($img);
    $h = imagesy($img);

    $fixed = imagecreatetruecolor($w, $h);
    imagealphablending($fixed, false);
    imagesavealpha($fixed, true);
    $transparent = imagecolorallocatealpha($fixed, 0, 0, 0, 127);
    imagefill($fixed, 0, 0, $transparent);

    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $rgb = imagecolorat($img, $x, $y);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            $avg = ($r + $g + $b) / 3;
            // što je svetlije → veća providnost
            $alpha = min(127, max(0, ($avg / 255) * 127));
            $color = imagecolorallocatealpha($fixed, 0, 0, 0, $alpha);
            imagesetpixel($fixed, $x, $y, $color);
        }
    }

    imagewebp($fixed, $file, 90);
    imagedestroy($img);
    imagedestroy($fixed);
}

echo "✅ Fixed shading alpha (transparent background applied)";
?>
