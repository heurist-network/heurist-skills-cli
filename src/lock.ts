import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import type { AgentType } from "./agents.ts";
import type { AgentInstallState, InstallMode, Scope } from "./installer.ts";

const LOCK_VERSION = 1;

export interface LockEntry {
  slug: string;
  name: string;
  sha256: string;
  installed_at: string;
  is_zip: boolean;
  install_method: InstallMode;
  canonical_path: string;
  agent_installs: Partial<Record<AgentType, AgentInstallState>>;
}

export interface LockFile {
  version: number;
  skills: Record<string, LockEntry>;
}

export interface ScopedLockEntry extends LockEntry {
  scope: Scope;
}

export function getProjectLockPath(cwd = process.cwd()): string {
  return join(cwd, "skills-lock.json");
}

export function getGlobalLockPath(): string {
  return join(homedir(), ".agents", ".skill-lock.json");
}

export function readProjectLock(cwd = process.cwd()): LockFile {
  return readLockFile(getProjectLockPath(cwd));
}

export function readGlobalLock(): LockFile {
  return readLockFile(getGlobalLockPath());
}

export function writeProjectLock(lock: LockFile, cwd = process.cwd()): void {
  writeLockFile(getProjectLockPath(cwd), lock, true);
}

export function writeGlobalLock(lock: LockFile): void {
  writeLockFile(getGlobalLockPath(), lock, false);
}

export function readLock(scope: Scope, cwd = process.cwd()): LockFile {
  return scope === "global" ? readGlobalLock() : readProjectLock(cwd);
}

export function writeLock(
  scope: Scope,
  lock: LockFile,
  cwd = process.cwd(),
): void {
  if (scope === "global") {
    writeGlobalLock(lock);
    return;
  }
  writeProjectLock(lock, cwd);
}

export function getLockEntry(
  scope: Scope,
  slug: string,
  cwd = process.cwd(),
): LockEntry | undefined {
  return readLock(scope, cwd).skills[slug];
}

export function upsertLockEntry(
  scope: Scope,
  entry: LockEntry,
  cwd = process.cwd(),
): void {
  const lock = readLock(scope, cwd);
  lock.skills[entry.slug] = entry;
  writeLock(scope, lock, cwd);
}

export function removeLockEntry(
  scope: Scope,
  slug: string,
  cwd = process.cwd(),
): boolean {
  const lock = readLock(scope, cwd);
  if (!(slug in lock.skills)) {
    return false;
  }
  delete lock.skills[slug];
  writeLock(scope, lock, cwd);
  return true;
}

export function getInstalledEntries(
  scope: Scope | "all" = "all",
  cwd = process.cwd(),
): ScopedLockEntry[] {
  const entries: ScopedLockEntry[] = [];

  if (scope === "all" || scope === "local") {
    for (const entry of Object.values(readProjectLock(cwd).skills)) {
      entries.push({ ...entry, scope: "local" });
    }
  }

  if (scope === "all" || scope === "global") {
    for (const entry of Object.values(readGlobalLock().skills)) {
      entries.push({ ...entry, scope: "global" });
    }
  }

  return entries;
}

function readLockFile(path: string): LockFile {
  const raw = readRawLockFile(path);
  if (!raw || typeof raw !== "object") {
    return createEmptyLock();
  }

  const skills = isRecord(raw["skills"]) ? raw["skills"] : {};
  const normalizedSkills: Record<string, LockEntry> = {};

  for (const [slug, entry] of Object.entries(skills)) {
    if (isLockEntry(entry)) {
      normalizedSkills[slug] = entry;
    }
  }

  return {
    version: typeof raw["version"] === "number" ? raw["version"] : LOCK_VERSION,
    skills: normalizedSkills,
  };
}

function writeLockFile(
  path: string,
  lock: LockFile,
  sortSkills: boolean,
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sortedSkills = sortSkills
    ? Object.fromEntries(
        Object.entries(lock.skills).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      )
    : lock.skills;

  const raw = readRawLockFile(path);
  const foreignSkills = isRecord(raw?.["skills"])
    ? Object.fromEntries(
        Object.entries(raw["skills"]).filter(([, entry]) => !isLockEntry(entry)),
      )
    : {};

  writeFileSync(
    path,
    JSON.stringify(
      {
        ...(raw && typeof raw === "object" ? raw : {}),
        version: typeof raw?.["version"] === "number" ? raw["version"] : LOCK_VERSION,
        skills: {
          ...foreignSkills,
          ...sortedSkills,
        },
      },
      null,
      2,
    ) + "\n",
  );
}

function createEmptyLock(): LockFile {
  return {
    version: LOCK_VERSION,
    skills: {},
  };
}

function readRawLockFile(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLockEntry(value: unknown): value is LockEntry {
  if (!isRecord(value)) return false;
  if (typeof value["slug"] !== "string") return false;
  if (typeof value["name"] !== "string") return false;
  if (typeof value["sha256"] !== "string") return false;
  if (typeof value["installed_at"] !== "string") return false;
  if (typeof value["is_zip"] !== "boolean") return false;
  if (value["install_method"] !== "symlink" && value["install_method"] !== "copy") {
    return false;
  }
  if (typeof value["canonical_path"] !== "string") return false;
  return isRecord(value["agent_installs"]);
}
