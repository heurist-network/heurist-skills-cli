/**
 * `heurist-skills add <slug>` — download and install a skill from the marketplace.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { downloadSkill, getSkill, listSkills } from "../api.ts";
import {
  agents,
  detectInstalledAgents,
  getNonUniversalAgents,
  getUniversalAgents,
  isValidAgent,
  type AgentType,
} from "../agents.ts";
import {
  getCanonicalPath,
  getInstallPath,
  installDownloadedSkill,
  removePathIfExists,
  type InstallMode,
  type Scope,
} from "../installer.ts";
import { getLockEntry, upsertLockEntry, type LockEntry } from "../lock.ts";

interface AddOptions {
  requestedAgents: string[];
  global: boolean;
  skipConfirm: boolean;
  copy: boolean;
  slug?: string;
}

export async function addCommand(args: string[]): Promise<void> {
  const options = parseAddOptions(args);
  let slug = options.slug;

  if (!slug) {
    slug = await interactiveSearch();
    if (!slug) return;
  }

  const spinner = p.spinner();
  spinner.start(`Fetching skill info for ${pc.cyan(slug)}`);

  let detail;
  try {
    detail = await getSkill(slug);
  } catch (err) {
    spinner.stop("Skill lookup failed.");
    if (err instanceof Error && err.message.includes("API error 404")) {
      throw new Error(`Skill ${slug} not found.`);
    }
    throw err;
  }

  if (detail.verification_status !== "verified") {
    spinner.stop(
      `Skill ${pc.red(slug)} is ${pc.yellow(detail.verification_status)} and cannot be installed.`,
    );
    throw new Error("Only verified skills can be installed.");
  }

  spinner.stop(`Found: ${pc.cyan(detail.name)} — ${detail.description}`);

  if (detail.external_api_dependencies.length > 0) {
    p.log.info(
      `External APIs: ${pc.dim(detail.external_api_dependencies.join(", "))}`,
    );
  }

  const warnings = getCapabilityWarnings(detail.capabilities);
  if (warnings.length > 0) {
    p.log.warn(
      pc.yellow("Capabilities:") + "\n" + warnings.map((w) => `  - ${w}`).join("\n"),
    );
    if (!options.skipConfirm) {
      const proceed = await p.confirm({
        message: "This skill has sensitive capabilities. Continue?",
      });
      if (!proceed || typeof proceed === "symbol") {
        p.log.info("Cancelled.");
        return;
      }
    }
  }

  const targetAgents = await resolveTargetAgents(options);
  const scope: Scope = await resolveScope(options);
  const installMode: InstallMode = await resolveInstallMode(options);
  const existing = getLockEntry(scope, slug);

  if (existing && !options.skipConfirm) {
    const shouldOverwrite = await p.confirm({
      message: `${pc.yellow(slug)} is already installed (${scope}). Reinstall?`,
    });
    if (!shouldOverwrite || typeof shouldOverwrite === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  const summaryLines = buildSummaryLines({
    slug,
    scope,
    mode: installMode,
    agents: targetAgents,
  });

  console.log();
  p.note(summaryLines.join("\n"), "Installation Summary");

  if (!options.skipConfirm) {
    const confirmed = await p.confirm({ message: "Proceed with installation?" });
    if (!confirmed || typeof confirmed === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  if (existing) {
    await cleanupLockEntry(existing);
  }

  spinner.start(`Downloading ${pc.cyan(slug)}`);
  const download = await downloadSkill(slug);
  spinner.stop(
    `Downloaded ${pc.green(download.filename)} (${formatBytes(download.content.length)})`,
  );

  spinner.start(`Installing to ${scope} scope`);
  const installResult = await installDownloadedSkill({
    scope,
    slug,
    content: download.content,
    isZip: download.isZip,
    agents: targetAgents,
    mode: installMode,
  });
  spinner.stop(`Installed to ${pc.dim(installResult.canonicalPath)}`);

  upsertLockEntry(scope, {
    slug,
    name: detail.name,
    sha256: download.sha256,
    installed_at: new Date().toISOString(),
    is_zip: download.isZip,
    install_method: installMode,
    canonical_path: installResult.canonicalPath,
    agent_installs: installResult.agentInstalls,
  });

  if (installResult.symlinkFallbackAgents.length > 0) {
    p.log.warn(
      `Symlinks failed for ${installResult.symlinkFallbackAgents.map((agent) => agents[agent].displayName).join(", ")}.`,
    );
    p.log.message(pc.dim("Files were copied instead."));
  }

  p.log.success(`${pc.green("+")} ${pc.bold(detail.name)} installed successfully.`);
}

function parseAddOptions(args: string[]): AddOptions {
  const options: AddOptions = {
    requestedAgents: [],
    global: false,
    skipConfirm: false,
    copy: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "-g" || arg === "--global") {
      options.global = true;
      continue;
    }
    if (arg === "-y" || arg === "--yes") {
      options.skipConfirm = true;
      continue;
    }
    if (arg === "--copy") {
      options.copy = true;
      continue;
    }
    if (arg === "-a" || arg === "--agent") {
      while (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        options.requestedAgents.push(args[++i]!);
      }
      continue;
    }
    if (!arg.startsWith("-") && !options.slug) {
      options.slug = arg;
    }
  }

  return options;
}

async function resolveTargetAgents(options: AddOptions): Promise<AgentType[]> {
  if (options.requestedAgents.length > 0) {
    const invalid = options.requestedAgents.filter((agent) => !isValidAgent(agent));
    if (invalid.length > 0) {
      throw new Error(
        `Invalid agent${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`,
      );
    }
    return ensureUniversalAgents(options.requestedAgents as AgentType[]);
  }

  const detectedAgents = await detectInstalledAgents();
  const universalAgents = new Set(getUniversalAgents());
  const detectedNonUniversal = detectedAgents.filter((agent) => !universalAgents.has(agent));

  if (options.skipConfirm) {
    return ensureUniversalAgents(detectedNonUniversal);
  }

  const universalList = getUniversalAgents();
  const universalNames = universalList.map((a) => agents[a].displayName).join(", ");

  if (detectedNonUniversal.length === 1) {
    const agent = detectedNonUniversal[0]!;
    p.log.info(
      `${pc.dim("Always included")} ${pc.cyan("(.agents/skills)")}: ${universalNames}`,
    );
    p.log.info(`Installing to: ${pc.cyan(agents[agent].displayName)}`);
    return ensureUniversalAgents([agent]);
  }

  p.log.info(
    `${pc.dim("Always included")} ${pc.cyan("(.agents/skills)")}: ${universalNames}`,
  );

  const selectableAgents = getNonUniversalAgents();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clack distributes Option<Value> over union literals; .map() widens it
  const selected = await (p.multiselect as any)({
    message: "Select additional agents to install to:",
    options: selectableAgents.map((agent) => ({
      value: agent,
      label: agents[agent].displayName,
      hint: options.global ? agents[agent].globalSkillsDir : agents[agent].skillsDir,
    })),
    initialValues: detectedNonUniversal,
  }) as AgentType[] | symbol;

  if (typeof selected === "symbol") {
    throw new Error("Installation cancelled.");
  }

  return ensureUniversalAgents(selected as AgentType[]);
}

async function resolveScope(options: AddOptions): Promise<Scope> {
  if (options.global) {
    return "global";
  }

  if (options.skipConfirm) {
    return "local";
  }

  const selected = await p.select({
    message: "Installation scope",
    options: [
      {
        value: "local",
        label: "Project",
        hint: "Install in the current repository",
      },
      {
        value: "global",
        label: "Global",
        hint: "Install in your home directory",
      },
    ],
  });

  if (typeof selected === "symbol") {
    throw new Error("Installation cancelled.");
  }

  return selected as Scope;
}

async function resolveInstallMode(options: AddOptions): Promise<InstallMode> {
  if (options.copy) {
    return "copy";
  }

  if (options.skipConfirm) {
    return "symlink";
  }

  const selected = await p.select({
    message: "Installation method",
    options: [
      {
        value: "symlink",
        label: "Symlink (Recommended)",
        hint: "Single source of truth, easier updates",
      },
      {
        value: "copy",
        label: "Copy",
        hint: "Write separate copies into each agent directory",
      },
    ],
  });

  if (typeof selected === "symbol") {
    throw new Error("Installation cancelled.");
  }

  return selected as InstallMode;
}

function ensureUniversalAgents(selectedAgents: AgentType[]): AgentType[] {
  const combined = new Set<AgentType>(getUniversalAgents());
  for (const agent of selectedAgents) {
    combined.add(agent);
  }
  return Array.from(combined);
}

function buildSummaryLines(options: {
  slug: string;
  scope: Scope;
  mode: InstallMode;
  agents: AgentType[];
}): string[] {
  const lines: string[] = [];
  const canonicalPath = getCanonicalPath(options.scope, options.slug);
  lines.push(`${pc.dim("scope:")} ${options.scope}`);
  lines.push(`${pc.dim("method:")} ${options.mode}`);
  lines.push(`${pc.dim("canonical:")} ${canonicalPath}`);
  lines.push(
    `${pc.dim("agents:")} ${options.agents.map((agent) => agents[agent].displayName).join(", ")}`,
  );

  if (options.mode === "copy") {
    for (const agent of options.agents) {
      lines.push(
        `${pc.dim(`${agents[agent].displayName}:`)} ${getInstallPath(options.scope, agent, options.slug)}`,
      );
    }
  }

  return lines;
}

async function cleanupLockEntry(entry: LockEntry): Promise<void> {
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

async function interactiveSearch(): Promise<string | undefined> {
  const searchTerm = await p.text({
    message: "Search skills:",
    placeholder: "e.g. defi, swap, analytics",
  });

  if (typeof searchTerm === "symbol" || !searchTerm) return undefined;

  const spinner = p.spinner();
  spinner.start("Searching marketplace...");

  const result = await listSkills({ search: searchTerm, limit: 20 });
  spinner.stop(`Found ${result.skills.length} skill(s).`);

  if (result.skills.length === 0) {
    p.log.warn("No skills found matching that query.");
    return undefined;
  }

  const selected = await p.select({
    message: "Select a skill to install:",
    options: result.skills.map((skill) => ({
      value: skill.slug,
      label: `${skill.name} ${pc.dim(`[${skill.category || "uncategorized"}]`)}`,
      hint: skill.description,
    })),
  });

  if (typeof selected === "symbol") return undefined;
  return selected as string;
}

function getCapabilityWarnings(capabilities: {
  requires_private_keys: boolean;
  can_sign_transactions: boolean;
  uses_leverage: boolean;
  requires_exchange_api_keys: boolean;
}): string[] {
  const warnings: string[] = [];
  if (capabilities.requires_private_keys) warnings.push("Requires private keys");
  if (capabilities.can_sign_transactions) warnings.push("Can sign transactions");
  if (capabilities.uses_leverage) warnings.push("Uses leverage");
  if (capabilities.requires_exchange_api_keys) warnings.push("Requires exchange API keys");
  return warnings;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
