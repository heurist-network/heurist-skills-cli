/**
 * `heurist-skills update` — update all installed skills to latest approved versions.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkUpdates, downloadSkill } from "../api.ts";
import { type AgentType } from "../agents.ts";
import {
  installDownloadedSkill,
  removePathIfExists,
  type InstallMode,
  type Scope,
} from "../installer.ts";
import {
  getInstalledEntries,
  upsertLockEntry,
  type LockEntry,
} from "../lock.ts";

export async function updateCommand(_args: string[]): Promise<void> {
  const installed = getInstalledEntries("all");

  if (installed.length === 0) {
    p.log.info("No skills installed. Nothing to update.");
    return;
  }

  const spinner = p.spinner();
  spinner.start(
    `Checking updates for ${installed.length} installed skill(s)...`,
  );

  const uniqueInstalled = Array.from(
    new Map(
      installed.map((entry) => [
        `${entry.slug}:${entry.sha256}`,
        { slug: entry.slug, sha256: entry.sha256 },
      ]),
    ).values(),
  );

  let updates;
  try {
    updates = await checkUpdates(uniqueInstalled);
  } catch (err) {
    spinner.stop("Failed to check for updates.");
    throw err;
  }

  const updatesBySlug = new Map(
    updates.map((update) => [update.slug, update.approved_sha256]),
  );

  const outdated = installed.filter((entry) => {
    const approvedSha = updatesBySlug.get(entry.slug);
    return approvedSha && approvedSha !== entry.sha256;
  });

  if (outdated.length === 0) {
    spinner.stop(pc.green("All skills are up to date."));
    return;
  }

  spinner.stop(pc.yellow(`${outdated.length} update(s) available:`));
  console.log();

  for (const entry of outdated) {
    const approvedSha = updatesBySlug.get(entry.slug) || "unknown";
    console.log(`  ${pc.cyan(entry.slug)} ${pc.dim(`[${entry.scope}]`)}`);
    console.log(`    current: ${pc.dim(entry.sha256.slice(0, 16))}...`);
    console.log(`    latest:  ${pc.dim(approvedSha.slice(0, 16))}...`);
    console.log();
  }

  let successCount = 0;
  let failCount = 0;

  for (const entry of outdated) {
    const targetAgents = Object.keys(entry.agent_installs) as AgentType[];
    const scope: Scope = entry.scope;
    const installMode: InstallMode = entry.install_method;

    p.log.info(`Updating ${pc.cyan(entry.slug)}...`);

    try {
      await cleanupEntry(entry);

      const download = await downloadSkill(entry.slug);

      const installResult = await installDownloadedSkill({
        scope,
        slug: entry.slug,
        content: download.content,
        isZip: download.isZip,
        agents: targetAgents,
        mode: installMode,
      });

      upsertLockEntry(scope, {
        slug: entry.slug,
        name: entry.name,
        sha256: download.sha256,
        installed_at: entry.installed_at,
        is_zip: download.isZip,
        install_method: installMode,
        canonical_path: installResult.canonicalPath,
        agent_installs: installResult.agentInstalls,
      });

      p.log.success(`${pc.green("✓")} ${pc.bold(entry.slug)} updated.`);
      successCount++;
    } catch (err) {
      p.log.error(
        `Failed to update ${entry.slug}: ${(err as Error).message}`,
      );
      failCount++;
    }
  }

  console.log();
  if (successCount > 0) {
    p.log.success(`Updated ${successCount} skill(s).`);
  }
  if (failCount > 0) {
    p.log.warn(`Failed to update ${failCount} skill(s).`);
  }
}

async function cleanupEntry(entry: LockEntry): Promise<void> {
  const paths = new Set<string>();
  paths.add(entry.canonical_path);
  for (const install of Object.values(entry.agent_installs)) {
    if (install?.path) {
      paths.add(install.path);
    }
  }
  for (const path of paths) {
    await removePathIfExists(path);
  }
}
