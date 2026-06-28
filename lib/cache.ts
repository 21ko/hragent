/**
 * Shared filesystem-based cache utility. Used by the CV parser to avoid
 * re-calling Claude for identical inputs.
 *
 * Pattern: SHA-256 hash of input → JSON file in .staffly/cv-cache/.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const CACHE_ROOT = join(process.cwd(), ".staffly", "cv-cache");

/** Compute a SHA-256 hex hash of the input (string or Buffer). */
export function contentHash(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Try to read a cached JSON value by its content hash.
 * Returns null if no cached entry exists.
 */
export function readCache<T>(hash: string): T | null {
  const cachePath = join(CACHE_ROOT, `${hash}.json`);
  if (!existsSync(cachePath)) return null;
  return JSON.parse(readFileSync(cachePath, "utf8")) as T;
}

/**
 * Write a value to the cache keyed by its content hash.
 * Creates intermediate directories as needed.
 */
export function writeCache<T>(hash: string, value: T): void {
  const cachePath = join(CACHE_ROOT, `${hash}.json`);
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(value, null, 2), "utf8");
}

/**
 * Cache-through helper: returns the cached value if present, otherwise calls
 * the compute function, caches the result, and returns it.
 */
export async function cachedCompute<T>(
  input: string | Buffer,
  compute: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean }> {
  const hash = contentHash(input);
  const cached = readCache<T>(hash);
  if (cached !== null) {
    return { value: cached, fromCache: true };
  }
  const value = await compute();
  writeCache(hash, value);
  return { value, fromCache: false };
}
