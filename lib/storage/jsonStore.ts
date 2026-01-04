import fs from "fs/promises";
import path from "path";

const resolvePath = (relativePath: string) =>
  path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);

export async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  const filePath = resolvePath(relativePath);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.warn(`[jsonStore] Failed to read ${filePath}:`, err?.message || err);
    }
    return fallback;
  }
}

export async function writeJsonFile(relativePath: string, data: unknown) {
  const filePath = resolvePath(relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
