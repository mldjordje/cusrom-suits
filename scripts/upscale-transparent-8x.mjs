import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const src4x = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x');
const fallback = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
const outDir = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x');

async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }

async function* walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) yield* walk(full);
    else if(/\.(png|webp|jpg|jpeg)$/i.test(e.name)) yield full;
  }
}

function destPath(file){
  const rel = path.relative(src, file).replace(/@4x(?=\.[^.]+$)/, '@8x');
  const p = path.join(outDir, rel.replace(/\.[^.]+$/, '.webp'));
  return p;
}

let src = src4x;
try { await fs.access(src4x); } catch { src = fallback; }

async function main(){
  try { await fs.access(src); } catch { console.error('Source not found', src); process.exit(1); }
  await ensureDir(outDir);
  let n=0;
  for await (const file of walk(src)){
    const meta = await sharp(file).metadata();
    const width = Math.round((meta.width || 0) * 2);
    const height = Math.round((meta.height || 0) * 2);
    const out = destPath(file);
    await ensureDir(path.dirname(out));
    await sharp(file)
      .resize({ width, height, kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 100, alphaQuality: 100, lossless: true })
      .toFile(out);
    n++;
    if(n % 10 === 0) console.log(`Processed ${n} files...`);
  }
  console.log(`Done. Files: ${n}. Output: ${outDir}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

