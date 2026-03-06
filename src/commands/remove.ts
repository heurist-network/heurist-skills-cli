/**
 * `heurist-skills remove <slug>` — uninstall a skill.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { agents, isValidAgent, type AgentType } from "../agents.ts";
import { removePathIfExists, type AgentInstallState, type Scope } from "../installer.ts";
import {
  getInstalledEntries,
  removeLockEntry,
  upsertLockEntry,
  type LockEntry,
  type ScopedLockEntry,
} from "../lock.ts";

interface RemoveOptions {
  global: boolean;
  skipConfirm: boolean;
  removeAll: boolean;
  requestedAgents: string[];
  slugs: string[];
}

export async function removeCommand(args: string[]): Promise<void> {
  const options = parseRemoveOptions(args);
  const requestedAgents = resolveRequestedAgents(options.requestedAgents);
  const installed = getInstalledEntries(options.global ? "global" : "all");

  if (installed.length === 0) {
    p.log.info("No skills installed.");
    return;
  }

  const targets = await resolveTargets(installed, options);
  if (targets.length === 0) {
    p.log.info("Nothing to remove.");
    return;
  }

  if (!options.skipConfirm) {
    const confirm = await p.confirm({
      message: `Remove ${targets.length} skill install(s)?`,
    });
    if (!confirm || typeof confirm === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  for (const target of targets) {
    const result = await removeFromEntry(target, requestedAgents);
    if (!result.changed) {
      p.log.warn(result.message);
      continue;
    }

    if (result.remainingAgents.length > 0) {
      p.log.success(
        `${pc.red("-")} ${target.slug} updated (${target.scope}); remaining agents: ${result.remainingAgents.map((agent) => agents[agent].displayName).join(", ")}`,
      );
    } else {
      p.log.success(`${pc.red("-")} ${target.slug} removed (${target.scope}).`);
    }
  }
}

function parseRemoveOptions(args: string[]): RemoveOptions {
  const options: RemoveOptions = {
    global: false,
    skipConfirm: false,
    removeAll: false,
    requestedAgents: [],
    slugs: [],
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
    if (arg === "--all") {
      options.removeAll = true;
      continue;
    }
    if (arg === "-a" || arg === "--agent") {
      while (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        options.requestedAgents.push(args[++i]!);
      }
      continue;
    }
    if (!arg.startsWith("-")) {
      options.slugs.push(arg);
    }
  }

  return options;
}

function resolveRequestedAgents(requestedAgents: string[]): AgentType[] | undefined {
  if (requestedAgents.length === 0) {
    return undefined;
  }

  const invalid = requestedAgents.filter((agent) => !isValidAgent(agent));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid agent${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`,
    );
  }

  return requestedAgents as AgentType[];
}

async function resolveTargets(
  installed: ScopedLockEntry[],
  options: RemoveOptions,
): Promise<ScopedLockEntry[]> {
  if (options.removeAll) {
    return installed;
  }

  if (options.slugs.length > 0) {
    const targets: ScopedLockEntry[] = [];

    for (const slug of options.slugs) {
      const matches = installed.filter((entry) => entry.slug === slug);
      if (matches.length === 0) {
        p.log.warn(`${slug} is not installed.`);
        continue;
      }

      if (matches.length === 1 || options.global) {
        targets.push(matches[0]!);
        continue;
      }

      const localMatch = matches.find((entry) => entry.scope === "local");
      const globalMatch = matches.find((entry) => entry.scope === "global");

      if (localMatch && globalMatch && !options.skipConfirm) {
        const selected = await p.select({
          message: `${slug} is installed in both project and global scope. Remove from:`,
          options: [
            { value: "local", label: "Project" },
            { value: "global", label: "Global" },
            { value: "both", label: "Both" },
          ],
        });

        if (typeof selected === "symbol") {
          continue;
        }

        if (selected === "both") {
          targets.push(localMatch, globalMatch);
          continue;
        }

        targets.push(selected === "local" ? localMatch : globalMatch);
        continue;
      }

      targets.push(localMatch || matches[0]!);
      if (localMatch && globalMatch && options.skipConfirm) {
        p.log.info(`${slug} is also installed globally. Use --global to remove that copy.`);
      }
    }

    return targets;
  }

  const selected = await p.multiselect({
    message: "Select installs to remove:",
    options: installed.map((entry) => ({
      value: `${entry.scope}:${entry.slug}`,
      label: `${entry.slug} — ${entry.name}`,
      hint: entry.scope,
    })),
  });

  if (typeof selected === "symbol") {
    return [];
  }

  const selectedValues = new Set(selected as string[]);
  return installed.filter((entry) => selectedValues.has(`${entry.scope}:${entry.slug}`));
}

async function removeFromEntry(
  entry: ScopedLockEntry,
  requestedAgents?: AgentType[],
): Promise<{ changed: boolean; message: string; remainingAgents: AgentType[] }> {
  const agentInstalls = { ...entry.agent_installs };
  const installedAgents = Object.keys(agentInstalls) as AgentType[];
  const targetAgents = requestedAgents
    ? installedAgents.filter((agent) => requestedAgents.includes(agent))
    : installedAgents;

  if (targetAgents.length === 0) {
    return {
      changed: false,
      message: `${entry.slug} is not installed for the selected agents.`,
      remainingAgents: installedAgents,
    };
  }

  for (const agent of targetAgents) {
    const install = agentInstalls[agent];
    if (!install) continue;

    if (install.kind !== "canonical") {
      await removePathIfExists(install.path);
    }
    delete agentInstalls[agent];
  }

  const remainingInstalls = Object.values(agentInstalls).filter(
    (install): install is AgentInstallState => Boolean(install),
  );
  const remainingNeedsCanonical = remainingInstalls.some((install) => install.kind !== "copy");

  if (!remainingNeedsCanonical) {
    await removePathIfExists(entry.canonical_path);
  }

  if (remainingInstalls.length === 0) {
    removeLockEntry(entry.scope, entry.slug);
  } else {
    upsertLockEntry(entry.scope, {
      ...stripScope(entry),
      agent_installs: agentInstalls,
    });
  }

  return {
    changed: true,
    message: "",
    remainingAgents: Object.keys(agentInstalls) as AgentType[],
  };
}

function stripScope(entry: ScopedLockEntry): LockEntry {
  return {
    slug: entry.slug,
    name: entry.name,
    sha256: entry.sha256,
    installed_at: entry.installed_at,
    is_zip: entry.is_zip,
    install_method: entry.install_method,
    canonical_path: entry.canonical_path,
    agent_installs: entry.agent_installs,
  };
}
