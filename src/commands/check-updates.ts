/**
 * `heurist-skills check-updates` — check if installed skills have newer versions.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkUpdates } from "../api.ts";
import { getInstalledEntries } from "../lock.ts";

export async function checkUpdatesCommand(_args: string[]): Promise<void> {
  const installed = getInstalledEntries("all");

  if (installed.length === 0) {
    p.log.info("No skills installed. Nothing to check.");
    return;
  }

  const spinner = p.spinner();
  spinner.start(
    `Checking updates for ${installed.length} installed skill(s)...`,
  );

  const uniqueInstalled = Array.from(
    new Map(
      installed.map((entry) => [`${entry.slug}:${entry.sha256}`, {
        slug: entry.slug,
        sha256: entry.sha256,
      }]),
    ).values(),
  );

  const updates = await checkUpdates(uniqueInstalled);
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

  p.log.info(
    `Run ${pc.cyan("heurist-skills add <slug>")} with the original scope to reinstall an approved update.`,
  );
}
