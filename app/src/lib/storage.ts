import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Document storage. `local` writes under STORAGE_LOCAL_DIR (outside /public — never web-served directly).
 * Files are only ever streamed back through authenticated routes.
 * Swap `driver` for an S3 implementation in production; the two functions are the whole interface.
 */
const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

export function validateUpload(file: File) {
  if (!ALLOWED.has(file.type)) return "Only JPG, PNG or PDF files are accepted.";
  if (file.size > MAX_BYTES) return "Files must be 5 MB or smaller.";
  return null;
}

export async function putFile(file: File, prefix: string) {
  const key = `${prefix}/${Date.now()}-${randomBytes(6).toString("hex")}`;
  const buf = Buffer.from(await file.arrayBuffer());
  // Sniff magic bytes — do not trust the client's MIME type alone.
  const magic = buf.subarray(0, 4).toString("hex");
  const okMagic = magic.startsWith("ffd8") || magic.startsWith("89504e47") || magic.startsWith("25504446");
  if (!okMagic) throw new Error("File content does not match its type.");
  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    const base = resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
    await mkdir(resolve(base, prefix), { recursive: true });
    await writeFile(resolve(base, key), buf);
    return key;
  }
  throw new Error("S3 driver not configured — set STORAGE_DRIVER=local or implement putFile for S3.");
}

export async function getFile(key: string) {
  if (key.includes("..")) throw new Error("Bad key");
  const base = resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
  return readFile(resolve(base, key));
}
