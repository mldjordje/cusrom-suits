import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const src = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro');
const zip = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro.zip');

async function main(){
  try { await fs.access(src); } catch { console.error('transparent_pro not found'); process.exit(1); }
  try { await fs.unlink(zip); } catch {}
  const ps = `Compress-Archive -Path \"${src}/*\" -DestinationPath \"${zip}\" -Force`;
  execSync(`powershell -NoLogo -NoProfile -Command "${ps}"`, { stdio: 'inherit' });
  console.log('ZIP at', zip);
}

main().catch(e=>{ console.error(e); process.exit(1); });

