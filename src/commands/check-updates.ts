/**
 * `heurist-skills check-updates` — check if installed skills have newer versions.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkUpdates } from "../api.ts";
import { getInstalledSlugs } from "../lock.ts";

export async function checkUpdatesCommand(_args: string[]): Promise<void> {
  const installed = getInstalledSlugs();

  if (installed.length === 0) {
    p.log.info("No skills installed. Nothing to check.");
    return;
  }

  const spinner = p.spinner();
  spinner.start(
    `Checking updates for ${installed.length} installed skill(s)...`,
  );

  const updates = await checkUpdates(
    installed.map((e) => ({ slug: e.slug, sha256: e.sha256 })),
  );

  if (updates.length === 0) {
    spinner.stop(pc.green("All skills are up to date."));
    return;
  }

  spinner.stop(
    pc.yellow(`${updates.length} update(s) available:`),
  );

  console.log();
  for (const update of updates) {
    const current = installed.find((e) => e.slug === update.slug);
    console.log(`  ${pc.cyan(update.slug)}`);
    console.log(
      `    current: ${pc.dim(current?.sha256.slice(0, 16) || "unknown")}...`,
    );
    console.log(
      `    latest:  ${pc.dim(update.approved_sha256.slice(0, 16))}...`,
    );
    console.log();
  }

  p.log.info(
    `Run ${pc.cyan("heurist-skills add <slug>")} to update a specific skill.`,
  );
}
