/**
 * Skill lock file management.
 *
 * Stores metadata about installed skills in ~/.heurist/skills-lock.json
 * for update tracking and management.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface LockEntry {
  slug: string;
  name: string;
  sha256: string;
  installed_at: string;
  install_path: string;
  is_zip: boolean;
}

export interface LockFile {
  version: 1;
  skills: Record<string, LockEntry>;
}

function getLockDir(): string {
  return join(homedir(), ".heurist");
}

function getLockPath(): string {
  return join(getLockDir(), "skills-lock.json");
}

export function readLock(): LockFile {
  const path = getLockPath();
  if (!existsSync(path)) {
    return { version: 1, skills: {} };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as LockFile;
  } catch {
    return { version: 1, skills: {} };
  }
}

export function writeLock(lock: LockFile): void {
  const dir = getLockDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getLockPath(), JSON.stringify(lock, null, 2) + "\n");
}

export function addToLock(entry: LockEntry): void {
  const lock = readLock();
  lock.skills[entry.slug] = entry;
  writeLock(lock);
}

export function removeFromLock(slug: string): void {
  const lock = readLock();
  delete lock.skills[slug];
  writeLock(lock);
}

export function getInstalledSlugs(): LockEntry[] {
  const lock = readLock();
  return Object.values(lock.skills);
}
