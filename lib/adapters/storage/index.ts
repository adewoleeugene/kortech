import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

// Private file storage (PRD 6.8, 7). Nothing stored here is ever served directly;
// files are read through an authorised route only. An S3/R2 implementation can
// replace LocalDiskStorage behind this interface.
export interface PrivateFileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9-]+(\/[a-zA-Z0-9._-]+)+$/;

function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key) || key.includes("..")) throw new Error(`Invalid storage key: ${key}`);
}

// Dev storage on local disk, outside /public. Keeps the content type in a sidecar file.
export class LocalDiskStorage implements PrivateFileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(key: string) {
    assertSafeKey(key);
    const full = resolve(join(this.root, key));
    if (!full.startsWith(this.root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return full;
  }

  async put(key: string, bytes: Uint8Array, contentType: string) {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    await writeFile(`${path}.type`, contentType);
  }

  async get(key: string) {
    const path = this.pathFor(key);
    try {
      const [bytes, contentType] = await Promise.all([readFile(path), readFile(`${path}.type`, "utf8")]);
      return { bytes: new Uint8Array(bytes), contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const path = this.pathFor(key);
    await Promise.all([rm(path, { force: true }), rm(`${path}.type`, { force: true })]);
  }
}

// In-memory storage for tests.
export class MemoryStorage implements PrivateFileStorage {
  readonly files = new Map<string, { bytes: Uint8Array; contentType: string }>();

  async put(key: string, bytes: Uint8Array, contentType: string) {
    assertSafeKey(key);
    this.files.set(key, { bytes, contentType });
  }

  async get(key: string) {
    return this.files.get(key) ?? null;
  }

  async delete(key: string) {
    this.files.delete(key);
  }
}

let storage: PrivateFileStorage | null = null;

export function getPrivateStorage(): PrivateFileStorage {
  if (storage) return storage;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") throw new Error(`Unknown STORAGE_DRIVER "${driver}"`);
  storage = new LocalDiskStorage(process.env.STORAGE_LOCAL_DIR || ".data/private");
  return storage;
}

export function setPrivateStorage(next: PrivateFileStorage | null) {
  storage = next;
}

// Public media (listing photos). Same interface, separate store: nothing private ever goes here.
// Served by app/media/[...key]/route.ts.
let mediaStorage: PrivateFileStorage | null = null;

export function getPublicMediaStorage(): PrivateFileStorage {
  if (mediaStorage) return mediaStorage;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") throw new Error(`Unknown STORAGE_DRIVER "${driver}"`);
  mediaStorage = new LocalDiskStorage(process.env.MEDIA_LOCAL_DIR || ".data/media");
  return mediaStorage;
}

export function setPublicMediaStorage(next: PrivateFileStorage | null) {
  mediaStorage = next;
}
