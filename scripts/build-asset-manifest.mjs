import { promises as fs } from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'public', 'assets', 'suits', 'transparent');
const target = path.join(root, 'asset-manifest.json');

const buckets = {
  base: root,
  shading: path.join(root, 'shading'),
  specular: path.join(root, 'specular'),
  edges: path.join(root, 'edges'),
};

const readFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|webp)$/i.test(name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const build = async () => {
  const files = {};
  const counts = {};
  for (const [bucket, dir] of Object.entries(buckets)) {
    const list = await readFiles(dir);
    files[bucket] = list;
    counts[bucket] = list.length;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    counts,
    files,
  };
  await fs.writeFile(target, JSON.stringify(payload, null, 2));
  console.log(`asset manifest written to ${path.relative(process.cwd(), target)}`);
};

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
