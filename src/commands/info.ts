/**
 * `heurist-skills info <slug>` — show detailed info about a skill.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { getSkill, listSkillFiles } from "../api.ts";
import { agents } from "../agents.ts";
import { pathExists } from "../installer.ts";
import { getInstalledEntries } from "../lock.ts";

export async function infoCommand(args: string[]): Promise<void> {
  const slug = args.filter((arg) => !arg.startsWith("-"))[0];

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

  spinner.stop(`${pc.bold(detail.slug)}`);

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

  for (const [name, value] of capList) {
    console.log(`    ${name}: ${value ? pc.yellow("yes") : pc.dim("no")}`);
  }

  try {
    const filesInfo = await listSkillFiles(slug);
    console.log();
    console.log(`  ${pc.bold("Files:")} (${filesInfo.file_count})`);
    for (const file of filesInfo.files) {
      console.log(`    ${pc.dim(file.path)}`);
    }
  } catch {
    // Files endpoint may fail for non-verified skills.
  }

  const installed = getInstalledEntries("all").filter((entry) => entry.slug === slug);
  if (installed.length > 0) {
    console.log();
    console.log(`  ${pc.bold("Installed:")}`);
    for (const entry of installed) {
      const canonicalExists = await pathExists(entry.canonical_path);
      const activeAgents = Object.entries(entry.agent_installs)
        .filter(([, install]) => {
          if (!install) return false;
          if (install.kind === "canonical") {
            return canonicalExists;
          }
          return true;
        })
        .map(([agent]) => agents[agent as keyof typeof agents].displayName);

      console.log(`    ${entry.scope}: ${pc.dim(entry.canonical_path)}`);
      console.log(`      sha256: ${pc.dim(`${entry.sha256.slice(0, 32)}...`)}`);
      if (activeAgents.length > 0) {
        console.log(`      agents: ${pc.dim(activeAgents.join(", "))}`);
      }
    }
  }

  console.log();
}
