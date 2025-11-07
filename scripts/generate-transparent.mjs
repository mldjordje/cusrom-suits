// Node.js + ImageMagick pipeline za transparent set (light/dark parovi)
// Pokretanje primeri:
//  node scripts/generate-transparent.mjs --in ./incoming/grey --out ./uploads/transparent-grey-v1 --flatten
//  node scripts/generate-transparent.mjs               (koristi podrazumevane putanje)

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : def;
}
const hasFlag = (flag) => process.argv.includes(flag);

const INPUT_DIR = arg("--in", "./transparent");
const OUTPUT_DIR = arg("--out", "./custom-suits-backend/uploads/transparent");
const FLATTEN = hasFlag("--flatten"); // kopira transparent PNG/WebP i u koren output-a

fs.mkdirSync(`${OUTPUT_DIR}/transparent`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/shading`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/specular`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/edges`, { recursive: true });

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`Ulazni folder ne postoji: ${INPUT_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(INPUT_DIR).filter((f) => /\.(png|webp)$/i.test(f));
if (!files.length) {
  console.error(`Nema PNG/WebP fajlova u: ${INPUT_DIR}`);
  process.exit(1);
}

function q(s) {
  // escape za Windows cmd
  return `"${s.replace(/"/g, '\\"')}"`;
}

for (const f of files) {
  if (f.includes("(1)")) continue; // preskačemo light; obrađujemo ga u paru
  const base = f.replace(/\.(png|webp)$/i, "");
  const ext = path.extname(f);
  const lightFile = `${base} (1)${ext}`;
  const darkFile = f;

  const lightPath = path.join(INPUT_DIR, lightFile);
  const darkPath = path.join(INPUT_DIR, darkFile);

  if (!fs.existsSync(lightPath)) {
    console.warn(`Preskačem '${base}': nema light varijante '${lightFile}'.`);
    continue;
  }

  console.log(`Obrada: ${base}`);

  // 1) Transparent baza (neutral gray) iz LIGHT varijante
  // - Zadržavamo alpha kanal iz ulaza; level blago centrira tonalitet
  execSync(
    `magick ${q(lightPath)} -alpha on -colorspace sRGB -colorspace Gray -level 25%,75% ${q(
      `${OUTPUT_DIR}/transparent/${base}.png`
    )}`,
    { stdio: "inherit" }
  );

  // 2) Shading mapa = dark / light (normalizovano)
  execSync(
    `magick ${q(darkPath)} ${q(lightPath)} -compose divide -composite -normalize ${q(
      `${OUTPUT_DIR}/shading/${base}.png`
    )}`,
    { stdio: "inherit" }
  );

  // 3) Specular (omekšano iz shading-a)
  execSync(
    `magick ${q(`${OUTPUT_DIR}/shading/${base}.png`)} -blur 0x3 -contrast-stretch 0%x15% ${q(
      `${OUTPUT_DIR}/specular/${base}.png`
    )}`,
    { stdio: "inherit" }
  );

  // 4) Edges (seams/ivice) iz DARK varijante – high-pass + normalizacija
  //    Ovo daje definiciju šavova i pregiba koja fali kod čistih maski.
  execSync(
    `magick ${q(darkPath)} -alpha off -colorspace Gray ( -clone 0 -blur 0x2 ) -compose minus -composite -level 5%,45% ${q(
      `${OUTPUT_DIR}/edges/${base}.png`
    )}`,
    { stdio: "inherit" }
  );
}

// 4) WebP export (lossless za čiste edge-ove sa alfom)
try {
  execSync(`magick mogrify -format webp -define webp:lossless=true ${q(`${OUTPUT_DIR}/transparent/*.png`)}`);
  execSync(`magick mogrify -format webp -define webp:lossless=true ${q(`${OUTPUT_DIR}/shading/*.png`)}`);
  execSync(`magick mogrify -format webp -define webp:lossless=true ${q(`${OUTPUT_DIR}/specular/*.png`)}`);
  execSync(`magick mogrify -format webp -define webp:lossless=true ${q(`${OUTPUT_DIR}/edges/*.png`)}`);
} catch (e) {
  console.warn("WebP konverzija nije uspela (da li je ImageMagick instaliran?)");
}

// 5) (Opc.) Flatten: kopiraj transparent *.png i *.webp u koren output-a
if (FLATTEN) {
  const srcDir = `${OUTPUT_DIR}/transparent`;
  for (const name of fs.readdirSync(srcDir)) {
    if (!/\.(png|webp)$/i.test(name)) continue;
    fs.copyFileSync(path.join(srcDir, name), path.join(OUTPUT_DIR, name));
  }
}

console.log("Gotovo. Rezultati u:");
console.log(` - ${OUTPUT_DIR}/transparent (baza)`);
console.log(` - ${OUTPUT_DIR}/shading`);
console.log(` - ${OUTPUT_DIR}/specular`);
console.log(` - ${OUTPUT_DIR}/edges`);
if (FLATTEN) console.log(` - ${OUTPUT_DIR} (flatten za app)`);
