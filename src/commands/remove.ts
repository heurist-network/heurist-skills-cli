/**
 * `heurist-skills remove <slug>` — uninstall a skill.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { getInstalledSlugs, removeFromLock } from "../lock.ts";
import { uninstall, type Scope } from "../installer.ts";

export async function removeCommand(args: string[]): Promise<void> {
  const scope: Scope = args.includes("-g") || args.includes("--global")
    ? "global"
    : "local";
  const skipConfirm = args.includes("-y") || args.includes("--yes");
  const removeAll = args.includes("--all");

  const positional = args.filter((a) => !a.startsWith("-"));
  const installed = getInstalledSlugs();

  if (installed.length === 0) {
    p.log.info("No skills installed.");
    return;
  }

  let slugsToRemove: string[];

  if (removeAll) {
    slugsToRemove = installed.map((e) => e.slug);
  } else if (positional.length > 0) {
    slugsToRemove = positional;
  } else {
    // Interactive selection
    const selected = await p.multiselect({
      message: "Select skills to remove:",
      options: installed.map((e) => ({
        value: e.slug,
        label: `${e.slug} — ${e.name}`,
      })),
    });

    if (typeof selected === "symbol") return;
    slugsToRemove = selected as string[];
  }

  if (slugsToRemove.length === 0) {
    p.log.info("Nothing to remove.");
    return;
  }

  if (!skipConfirm) {
    const confirm = await p.confirm({
      message: `Remove ${slugsToRemove.length} skill(s)? ${pc.dim(slugsToRemove.join(", "))}`,
    });
    if (!confirm || typeof confirm === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  for (const slug of slugsToRemove) {
    const removed = uninstall(scope, slug);
    removeFromLock(slug);
    if (removed) {
      p.log.success(`${pc.red("-")} ${slug} removed.`);
    } else {
      p.log.warn(`${slug} was not found on disk (cleaned lock entry).`);
    }
  }
}
