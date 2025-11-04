import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x');
const outDir = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_deploy8x');

async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }

async function* walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const strip = (name) => name.replace(/@8x(?=\.[^.]+$)/, '');

function destPath(file){
  const rel = path.relative(srcDir, file);
  return path.join(outDir, path.dirname(rel), strip(path.basename(rel)));
}

async function main(){
  try { await fs.access(srcDir); } catch { console.error('Source not found', srcDir); process.exit(1); }
  await ensureDir(outDir);
  let n=0;
  for await (const file of walk(srcDir)){
    const out = destPath(file);
    await ensureDir(path.dirname(out));
    await fs.copyFile(file, out);
    n++;
  }
  console.log(`Prepared ${n} files into ${outDir}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

