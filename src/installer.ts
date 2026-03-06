import {
  access,
  lstat,
  mkdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "fs/promises";
import { homedir, platform } from "os";
import { dirname, join, normalize, relative, resolve, sep } from "path";
import { inflateRawSync } from "zlib";
import { agents, isUniversalAgent, type AgentType } from "./agents.ts";

export type Scope = "local" | "global";
export type InstallMode = "symlink" | "copy";
export type AgentInstallKind = "canonical" | "symlink" | "copy";

export interface AgentInstallState {
  path: string;
  kind: AgentInstallKind;
}

export interface InstallResult {
  canonicalPath: string;
  agentInstalls: Partial<Record<AgentType, AgentInstallState>>;
  symlinkFallbackAgents: AgentType[];
}

interface ZipEntry {
  path: string;
  isDirectory: boolean;
  content: Buffer;
}

export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.\-]+|[.\-]+$/g, "");

  return sanitized.substring(0, 255) || "unnamed-skill";
}

export function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return normalizedTarget === normalizedBase || normalizedTarget.startsWith(normalizedBase + sep);
}

export function getCanonicalSkillsDir(
  scope: Scope,
  cwd = process.cwd(),
): string {
  const baseDir = scope === "global" ? homedir() : cwd;
  return join(baseDir, ".agents", "skills");
}

export function getCanonicalPath(
  scope: Scope,
  slug: string,
  cwd = process.cwd(),
): string {
  const canonicalBase = getCanonicalSkillsDir(scope, cwd);
  const canonicalPath = join(canonicalBase, sanitizeName(slug));
  if (!isPathSafe(canonicalBase, canonicalPath)) {
    throw new Error("Invalid skill slug: potential path traversal detected.");
  }
  return canonicalPath;
}

export function getAgentBaseDir(
  scope: Scope,
  agentType: AgentType,
  cwd = process.cwd(),
): string {
  if (isUniversalAgent(agentType)) {
    return getCanonicalSkillsDir(scope, cwd);
  }

  const agent = agents[agentType];
  if (scope === "global") {
    if (!agent.globalSkillsDir) {
      throw new Error(`${agent.displayName} does not support global skill installation.`);
    }
    return agent.globalSkillsDir;
  }

  return join(cwd, agent.skillsDir);
}

export function getInstallPath(
  scope: Scope,
  agentType: AgentType,
  slug: string,
  cwd = process.cwd(),
): string {
  const baseDir = getAgentBaseDir(scope, agentType, cwd);
  const installPath = join(baseDir, sanitizeName(slug));
  if (!isPathSafe(baseDir, installPath)) {
    throw new Error("Invalid skill slug: potential path traversal detected.");
  }
  return installPath;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function removePathIfExists(path: string): Promise<boolean> {
  try {
    await rm(path, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function cleanAndCreateDirectory(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true }).catch(() => undefined);
  await mkdir(path, { recursive: true });
}

async function createRelativeSymlink(
  target: string,
  linkPath: string,
): Promise<boolean> {
  try {
    const resolvedTarget = resolve(target);
    const resolvedLinkPath = resolve(linkPath);

    if (resolvedTarget === resolvedLinkPath) {
      return true;
    }

    const existing = await lstat(linkPath).catch(() => null);
    if (existing) {
      if (existing.isSymbolicLink()) {
        const currentTarget = await readlink(linkPath).catch(() => "");
        if (resolve(dirname(linkPath), currentTarget) === resolvedTarget) {
          return true;
        }
      }
      await rm(linkPath, { recursive: true, force: true });
    }

    const linkDir = dirname(linkPath);
    await mkdir(linkDir, { recursive: true });
    const relativeTarget = relative(linkDir, target);
    const symlinkType = platform() === "win32" ? "junction" : undefined;
    await symlink(relativeTarget, linkPath, symlinkType);
    return true;
  } catch {
    return false;
  }
}

async function writeSkillBundle(
  targetDir: string,
  content: Buffer,
  isZip: boolean,
): Promise<void> {
  await cleanAndCreateDirectory(targetDir);

  if (!isZip) {
    await writeFile(join(targetDir, "SKILL.md"), content);
    return;
  }

  const entries = parseZipEntries(content);
  for (const entry of entries) {
    const fullPath = join(targetDir, entry.path);
    if (!isPathSafe(targetDir, fullPath)) {
      continue;
    }

    if (entry.isDirectory) {
      await mkdir(fullPath, { recursive: true });
      continue;
    }

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, entry.content);
  }
}

export async function installDownloadedSkill(options: {
  scope: Scope;
  slug: string;
  content: Buffer;
  isZip: boolean;
  agents: AgentType[];
  mode: InstallMode;
  cwd?: string;
}): Promise<InstallResult> {
  const cwd = options.cwd || process.cwd();
  const canonicalPath = getCanonicalPath(options.scope, options.slug, cwd);
  const writtenPaths = new Set<string>();
  const agentInstalls: Partial<Record<AgentType, AgentInstallState>> = {};
  const symlinkFallbackAgents: AgentType[] = [];

  const ensureBundleAt = async (path: string): Promise<void> => {
    if (writtenPaths.has(path)) return;
    await writeSkillBundle(path, options.content, options.isZip);
    writtenPaths.add(path);
  };

  if (options.mode === "symlink") {
    await ensureBundleAt(canonicalPath);
  }

  for (const agentType of options.agents) {
    const agentPath = getInstallPath(options.scope, agentType, options.slug, cwd);

    if (options.mode === "copy") {
      await ensureBundleAt(agentPath);
      agentInstalls[agentType] = {
        path: agentPath,
        kind: agentPath === canonicalPath ? "canonical" : "copy",
      };
      continue;
    }

    if (agentPath === canonicalPath) {
      agentInstalls[agentType] = {
        path: canonicalPath,
        kind: "canonical",
      };
      continue;
    }

    const linked = await createRelativeSymlink(canonicalPath, agentPath);
    if (linked) {
      agentInstalls[agentType] = {
        path: agentPath,
        kind: "symlink",
      };
      continue;
    }

    await ensureBundleAt(agentPath);
    agentInstalls[agentType] = {
      path: agentPath,
      kind: "copy",
    };
    symlinkFallbackAgents.push(agentType);
  }

  return {
    canonicalPath,
    agentInstalls,
    symlinkFallbackAgents,
  };
}

function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];

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
    throw new Error("Invalid zip: cannot find end of central directory.");
  }

  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);
  const numEntries = buf.readUInt16LE(eocdOffset + 10);
  let offset = centralDirOffset;

  for (let i = 0; i < numEntries; i++) {
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

    if (isDirectory) {
      entries.push({ path: filename, isDirectory: true, content: Buffer.alloc(0) });
      offset += 46 + filenameLen + extraLen + commentLen;
      continue;
    }

    const localFilenameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFilenameLen + localExtraLen;

    let fileContent: Buffer;
    if (compressionMethod === 0) {
      fileContent = buf.subarray(dataOffset, dataOffset + uncompressedSize);
    } else if (compressionMethod === 8) {
      const compressed = buf.subarray(dataOffset, dataOffset + compressedSize);
      fileContent = inflateRawSync(compressed);
    } else {
      offset += 46 + filenameLen + extraLen + commentLen;
      continue;
    }

    entries.push({
      path: filename,
      isDirectory: false,
      content: fileContent,
    });

    offset += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}
