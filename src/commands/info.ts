/**
 * `heurist-skills info <slug>` — show detailed info about a skill.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { getSkill, listSkillFiles } from "../api.ts";
import { getInstalledSlugs } from "../lock.ts";

export async function infoCommand(args: string[]): Promise<void> {
  const slug = args.filter((a) => !a.startsWith("-"))[0];

  if (!slug) {
    p.log.error("Usage: heurist-skills info <slug>");
    return;
  }

  const spinner = p.spinner();
  spinner.start(`Fetching info for ${pc.cyan(slug)}`);

  let detail;
  try {
    detail = await getSkill(slug);
  } catch {
    spinner.stop(`Skill ${pc.red(slug)} not found.`);
    return;
  }

  spinner.stop(`${pc.bold(detail.name)}`);

  const installed = getInstalledSlugs().find((e) => e.slug === slug);

  console.log();
  console.log(`  ${pc.bold("Name:")}         ${detail.name}`);
  console.log(`  ${pc.bold("Slug:")}         ${detail.slug}`);
  console.log(`  ${pc.bold("Description:")}  ${detail.description}`);
  console.log(`  ${pc.bold("Category:")}     ${detail.category || "—"}`);
  console.log(`  ${pc.bold("Risk Tier:")}    ${detail.risk_tier || "—"}`);
  console.log(`  ${pc.bold("Status:")}       ${detail.verification_status}`);
  console.log(`  ${pc.bold("Source:")}       ${detail.source_url || "—"}`);

  if (detail.author?.display_name) {
    console.log(`  ${pc.bold("Author:")}       ${detail.author.display_name}`);
  }
  if (detail.author?.github_username) {
    console.log(`  ${pc.bold("GitHub:")}       ${detail.author.github_username}`);
  }

  console.log();
  console.log(`  ${pc.bold("Capabilities:")}`);
  const caps = detail.capabilities;
  const capList = [
    ["requires_secrets", caps.requires_secrets],
    ["requires_private_keys", caps.requires_private_keys],
    ["requires_exchange_api_keys", caps.requires_exchange_api_keys],
    ["can_sign_transactions", caps.can_sign_transactions],
    ["uses_leverage", caps.uses_leverage],
    ["accesses_user_portfolio", caps.accesses_user_portfolio],
  ] as const;

  for (const [name, val] of capList) {
    const icon = val ? pc.yellow("yes") : pc.dim("no");
    console.log(`    ${name}: ${icon}`);
  }

  // Show files
  try {
    const filesInfo = await listSkillFiles(slug);
    console.log();
    console.log(`  ${pc.bold("Files:")} (${filesInfo.file_count})`);
    for (const f of filesInfo.files) {
      console.log(`    ${pc.dim(f.path)} ${pc.dim(`(${formatBytes(f.size)})`)}`);
    }
  } catch {
    // Files endpoint may fail for non-verified skills
  }

  if (installed) {
    console.log();
    console.log(`  ${pc.green("Installed")} at ${pc.dim(installed.install_path)}`);
    console.log(`  ${pc.dim(`sha256: ${installed.sha256.slice(0, 32)}...`)}`);
  }

  console.log();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
