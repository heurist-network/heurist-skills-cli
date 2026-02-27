/**
 * Skill installer — writes downloaded skill files to the local filesystem.
 *
 * Skills are installed to:
 *   Global:  ~/.heurist/skills/<slug>/
 *   Local:   ./.heurist/skills/<slug>/
 *
 * Single-file skills → SKILL.md
 * Folder skills → extracted zip preserving hierarchy
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { inflateRawSync } from "zlib";
import { homedir } from "os";
import { join, resolve, normalize } from "path";

export type Scope = "global" | "local";

export function getSkillsDir(scope: Scope): string {
  if (scope === "global") {
    return join(homedir(), ".heurist", "skills");
  }
  return resolve(".heurist", "skills");
}

export function getSkillDir(scope: Scope, slug: string): string {
  return join(getSkillsDir(scope), slug);
}

export function isInstalled(scope: Scope, slug: string): boolean {
  return existsSync(getSkillDir(scope, slug));
}

/** Install a single-file skill (SKILL.md). */
export function installSingleFile(
  scope: Scope,
  slug: string,
  content: Buffer,
): string {
  const dir = getSkillDir(scope, slug);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "SKILL.md");
  writeFileSync(filePath, content);
  return dir;
}

/** Install a folder skill from a zip buffer. */
export function installZipBundle(
  scope: Scope,
  slug: string,
  zipBuffer: Buffer,
): string {
  const dir = getSkillDir(scope, slug);

  // Clean existing install
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });

  const entries = parseZipEntries(zipBuffer);

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    // Security: prevent path traversal
    const normalized = normalize(entry.path);
    if (normalized.startsWith("..") || normalized.includes("..")) {
      continue;
    }

    const fullPath = join(dir, entry.path);
    const parentDir = join(fullPath, "..");
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(fullPath, entry.content);
  }

  return dir;
}

/** Uninstall a skill by removing its directory. */
export function uninstall(scope: Scope, slug: string): boolean {
  const dir = getSkillDir(scope, slug);
  if (!existsSync(dir)) {
    return false;
  }
  rmSync(dir, { recursive: true, force: true });
  return true;
}

// ---- Minimal zip parser (no external deps) ----

interface ZipEntry {
  path: string;
  isDirectory: boolean;
  content: Buffer;
}

function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];

  // Find End of Central Directory record
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid zip: cannot find end of central directory");
  }

  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);
  const numEntries = buf.readUInt16LE(eocdOffset + 10);

  let offset = centralDirOffset;

  for (let i = 0; i < numEntries; i++) {
    // Central directory file header signature
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }

    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const filenameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const compressionMethod = buf.readUInt16LE(offset + 10);

    const filename = buf.toString("utf-8", offset + 46, offset + 46 + filenameLen);
    const isDirectory = filename.endsWith("/");

    if (!isDirectory) {
      // Read from local file header
      const localFilenameLen = buf.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localFilenameLen + localExtraLen;

      let content: Buffer;
      if (compressionMethod === 0) {
        // Stored (no compression)
        content = buf.subarray(dataOffset, dataOffset + uncompressedSize);
      } else if (compressionMethod === 8) {
        // Deflated — use Node.js zlib (synchronous)
        const compressed = buf.subarray(dataOffset, dataOffset + compressedSize);
        content = inflateRawSync(compressed);
      } else {
        // Skip unsupported compression methods
        offset += 46 + filenameLen + extraLen + commentLen;
        continue;
      }

      entries.push({ path: filename, isDirectory: false, content });
    } else {
      entries.push({ path: filename, isDirectory: true, content: Buffer.alloc(0) });
    }

    offset += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}
