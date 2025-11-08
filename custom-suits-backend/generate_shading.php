<?php
// ✅ Putanje
$inputDir = __DIR__ . "/uploads/transparent";
$outputDir = __DIR__ . "/uploads/shading";

if (!is_dir($outputDir)) mkdir($outputDir, 0777, true);

$files = glob("$inputDir/*.{png,webp,jpg,jpeg}", GLOB_BRACE);
$total = count($files);
$count = 0;

// 🔧 Parametri osvetljenja (imitacija Hockerty)
$shadowStrength = 35;   // jačina senke (0–255, niže = jača)
$highlightBoost = 25;   // jačina svetla
$contrast = 1.15;       // kontrast ivica
$blurRadius = 6;        // blur senke

foreach ($files as $path) {
    $count++;
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $filename = basename($path, ".$ext");
    $outPath = "$outputDir/$filename.webp";

    // 🔹 Učitavanje slike
    if ($ext === "webp") $img = imagecreatefromwebp($path);
    elseif ($ext === "png") $img = imagecreatefrompng($path);
    else continue;
    imagesavealpha($img, true);

    $w = imagesx($img);
    $h = imagesy($img);

    // 🔹 Kreiraj novi shading sloj (prozirna osnova)
    $shade = imagecreatetruecolor($w, $h);
    imagealphablending($shade, false);
    imagesavealpha($shade, true);
    $transparent = imagecolorallocatealpha($shade, 0, 0, 0, 127);
    imagefill($shade, 0, 0, $transparent);

    // 🔹 Dodaj gradijent (svetlo gore-levo → senka dole-desno)
    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $alpha = (127 - ($y / $h) * $shadowStrength + ($x / $w) * $highlightBoost);
            $alpha = max(0, min(127, $alpha));
            $color = imagecolorallocatealpha($shade, 0, 0, 0, $alpha);
            imagesetpixel($shade, $x, $y, $color);
        }
    }

    // 🔹 Blur senke (mekše ivice)
    for ($i = 0; $i < $blurRadius; $i++) {
        imagefilter($shade, IMG_FILTER_GAUSSIAN_BLUR);
    }

    // 🔹 Dodaj kontrast
    imagefilter($shade, IMG_FILTER_CONTRAST, -($contrast * 10));

    // 🔹 Sačuvaj kao WEBP
    imagewebp($shade, $outPath, 90);
    imagedestroy($shade);
    imagedestroy($img);
}

echo "<h2>✅ Shading generation complete</h2>";
echo "<p>Processed $count of $total files.</p>";
echo "<p>Saved to: <b>uploads/shading/</b></p>";
?>
