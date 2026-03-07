/**
 * `heurist-skills list` — list installed or available skills.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { listSkills } from "../api.ts";
import { agents, isValidAgent, type AgentType } from "../agents.ts";
import { pathExists, type Scope } from "../installer.ts";
import { getInstalledEntries, type ScopedLockEntry } from "../lock.ts";

export interface ListOptions {
  showRemote: boolean;
  global: boolean;
  category?: string;
  search?: string;
  agentFilter?: AgentType[];
}

export async function listCommand(args: string[]): Promise<void> {
  const options = parseListOptions(args);

  if (options.showRemote || options.search || options.category) {
    await listRemote(options);
    return;
  }

  await listLocal(options.global ? "global" : "local", options.agentFilter);
}

function parseListOptions(args: string[]): ListOptions {
  const options: ListOptions = {
    showRemote: false,
    global: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--remote" || arg === "-r") {
      options.showRemote = true;
      continue;
    }
    if (arg === "-g" || arg === "--global") {
      options.global = true;
      continue;
    }
    if (arg === "--category" || arg === "-c") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        options.category = value;
        i++;
      }
      continue;
    }
    if (arg === "--search" || arg === "-s") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        options.search = value;
        i++;
      }
      continue;
    }
    if (arg === "-a" || arg === "--agent") {
      const selected: AgentType[] = [];
      while (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        const value = args[++i]!;
        if (!isValidAgent(value)) {
          throw new Error(`Invalid agent: ${value}`);
        }
        selected.push(value);
      }
      options.agentFilter = selected;
    }
  }

  return options;
}

async function listLocal(
  scope: Scope,
  agentFilter?: AgentType[],
): Promise<void> {
  const installed = getInstalledEntries(scope)
    .sort((left, right) => left.slug.localeCompare(right.slug));

  if (installed.length === 0) {
    p.log.info(
      scope === "global"
        ? "No global skills installed."
        : "No project skills installed.",
    );
    return;
  }

  const visibleSkills = (
    await Promise.all(installed.map((entry) => resolveVisibleInstall(entry)))
  ).filter((entry): entry is VisibleInstall => Boolean(entry));

  const filtered = agentFilter
    ? visibleSkills.filter((entry) =>
        entry.activeAgents.some((agent) => agentFilter.includes(agent)),
      )
    : visibleSkills;

  if (filtered.length === 0) {
    p.log.info("No skills matched the selected filters.");
    return;
  }

  p.log.info(pc.bold(`${scope === "global" ? "Global" : "Project"} skills (${filtered.length}):`));
  console.log();

  for (const entry of filtered) {
    const folder = entry.isZip ? pc.dim(" [folder]") : "";
    console.log(`  ${pc.cyan(entry.slug)} — ${entry.name}${folder}`);
    console.log(`    ${pc.dim(entry.displayPath)}`);
    console.log(
      `    ${pc.dim(`agents: ${entry.activeAgents.map((agent) => agents[agent].displayName).join(", ")}`)}`,
    );
    console.log(`    ${pc.dim(`sha256: ${entry.sha256.slice(0, 16)}...`)}`);
    console.log();
  }
}

export async function listRemote(options: ListOptions): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Fetching skills from marketplace...");

  const result = await listSkills({
    category: options.category || undefined,
    search: options.search || undefined,
    limit: 50,
  });

  spinner.stop(`Showing ${result.skills.length} verified skill(s).`);

  if (result.skills.length === 0) {
    p.log.warn("No skills found.");
    return;
  }

  const installed = new Set(getInstalledEntries("all").map((entry) => entry.slug));

  console.log();
  for (const skill of result.skills) {
    const status = installed.has(skill.slug) ? pc.green(" [installed]") : "";
    const category = skill.category ? pc.dim(` [${skill.category}]`) : "";
    const risk = skill.risk_tier ? pc.dim(` risk:${skill.risk_tier}`) : "";
    const externalApis = skill.external_api_dependencies.length > 0
      ? pc.dim(` apis:${skill.external_api_dependencies.join(", ")}`)
      : "";

    console.log(`  ${pc.cyan(skill.slug)}${category}${risk}${externalApis}${status}`);
    console.log(`    ${skill.description}`);

    const warnings: string[] = [];
    if (skill.capabilities.requires_private_keys) warnings.push("private-keys");
    if (skill.capabilities.can_sign_transactions) warnings.push("sign-tx");
    if (skill.capabilities.uses_leverage) warnings.push("leverage");
    if (warnings.length > 0) {
      console.log(`    ${pc.yellow(`caps: ${warnings.join(", ")}`)}`);
    }

    console.log();
  }
}

interface VisibleInstall {
  slug: string;
  name: string;
  sha256: string;
  isZip: boolean;
  displayPath: string;
  activeAgents: AgentType[];
}

async function resolveVisibleInstall(
  entry: ScopedLockEntry,
): Promise<VisibleInstall | undefined> {
  const canonicalExists = await pathExists(entry.canonical_path);
  const activeAgents: AgentType[] = [];
  let displayPath = canonicalExists ? entry.canonical_path : "";

  for (const [agentName, install] of Object.entries(entry.agent_installs) as Array<
    [AgentType, NonNullable<ScopedLockEntry["agent_installs"][AgentType]>]
  >) {
    if (install.kind === "canonical") {
      if (canonicalExists) {
        activeAgents.push(agentName);
      }
      continue;
    }

    if (await pathExists(install.path)) {
      activeAgents.push(agentName);
      if (!displayPath) {
        displayPath = install.path;
      }
    }
  }

  if (activeAgents.length === 0) {
    return undefined;
  }

  return {
    slug: entry.slug,
    name: entry.name,
    sha256: entry.sha256,
    isZip: entry.is_zip,
    displayPath,
    activeAgents,
  };
}
