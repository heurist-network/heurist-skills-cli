/**
 * `heurist-skills list` — list installed or available skills.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { listSkills } from "../api.ts";
import { getInstalledSlugs } from "../lock.ts";

export async function listCommand(args: string[]): Promise<void> {
  const showRemote =
    args.includes("--remote") || args.includes("-r");
  const category = getFlagValue(args, "--category") || getFlagValue(args, "-c");
  const search = getFlagValue(args, "--search") || getFlagValue(args, "-s");

  if (showRemote) {
    await listRemote(category, search);
  } else {
    listLocal();
  }
}

function listLocal(): void {
  const installed = getInstalledSlugs();

  if (installed.length === 0) {
    p.log.info(
      "No skills installed. Use " +
        pc.cyan("heurist-skills add <slug>") +
        " or " +
        pc.cyan("heurist-skills list --remote") +
        " to browse.",
    );
    return;
  }

  p.log.info(pc.bold(`Installed skills (${installed.length}):`));
  console.log();

  for (const entry of installed) {
    const zip = entry.is_zip ? pc.dim(" [folder]") : "";
    console.log(
      `  ${pc.cyan(entry.slug)} — ${entry.name}${zip}`,
    );
    console.log(
      `    ${pc.dim(entry.install_path)}`,
    );
    console.log(
      `    ${pc.dim(`sha256: ${entry.sha256.slice(0, 16)}...`)}`,
    );
    console.log();
  }
}

async function listRemote(
  category?: string,
  search?: string,
): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Fetching skills from marketplace...");

  const result = await listSkills({
    category: category || undefined,
    search: search || undefined,
    limit: 50,
  });

  spinner.stop(`Found ${result.total} verified skill(s).`);

  if (result.skills.length === 0) {
    p.log.warn("No skills found.");
    return;
  }

  const installed = new Set(getInstalledSlugs().map((e) => e.slug));

  console.log();
  for (const skill of result.skills) {
    const status = installed.has(skill.slug)
      ? pc.green(" [installed]")
      : "";
    const cat = skill.category
      ? pc.dim(` [${skill.category}]`)
      : "";
    const risk = skill.risk_tier
      ? pc.dim(` risk:${skill.risk_tier}`)
      : "";

    console.log(
      `  ${pc.cyan(skill.slug)}${cat}${risk}${status}`,
    );
    console.log(`    ${skill.description}`);

    // Show dangerous capabilities
    const caps = skill.capabilities;
    const warnings: string[] = [];
    if (caps.requires_private_keys) warnings.push("private-keys");
    if (caps.can_sign_transactions) warnings.push("sign-tx");
    if (caps.uses_leverage) warnings.push("leverage");
    if (warnings.length > 0) {
      console.log(`    ${pc.yellow(`caps: ${warnings.join(", ")}`)}`);
    }

    console.log();
  }
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}
