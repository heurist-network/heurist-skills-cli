/**
 * `heurist-skills add <slug>` — download and install a skill from the marketplace.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { downloadSkill, getSkill, listSkills } from "../api.ts";
import { addToLock } from "../lock.ts";
import {
  installSingleFile,
  installZipBundle,
  isInstalled,
  type Scope,
} from "../installer.ts";

export async function addCommand(args: string[]): Promise<void> {
  const scope: Scope = args.includes("-g") || args.includes("--global")
    ? "global"
    : "local";

  // Filter out flags to get slug
  const positional = args.filter((a) => !a.startsWith("-"));
  let slug = positional[0];

  // If no slug provided, show interactive search
  if (!slug) {
    slug = await interactiveSearch();
    if (!slug) return;
  }

  const spinner = p.spinner();

  // Check if already installed
  if (isInstalled(scope, slug)) {
    const shouldOverwrite = await p.confirm({
      message: `${pc.yellow(slug)} is already installed (${scope}). Reinstall?`,
    });
    if (!shouldOverwrite || typeof shouldOverwrite === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  // Fetch skill details
  spinner.start(`Fetching skill info for ${pc.cyan(slug)}`);
  let detail;
  try {
    detail = await getSkill(slug);
  } catch (err) {
    spinner.stop(`Skill ${pc.red(slug)} not found.`);
    return;
  }
  spinner.stop(`Found: ${pc.cyan(detail.name)} — ${detail.description}`);

  // Show capabilities warning if risky
  const caps = detail.capabilities;
  const warnings: string[] = [];
  if (caps.requires_private_keys) warnings.push("Requires private keys");
  if (caps.can_sign_transactions) warnings.push("Can sign transactions");
  if (caps.uses_leverage) warnings.push("Uses leverage");
  if (caps.requires_exchange_api_keys) warnings.push("Requires exchange API keys");

  if (warnings.length > 0) {
    p.log.warn(
      pc.yellow("Capabilities:") + "\n" + warnings.map((w) => `  - ${w}`).join("\n"),
    );
    const proceed = await p.confirm({
      message: "This skill has sensitive capabilities. Continue?",
    });
    if (!proceed || typeof proceed === "symbol") {
      p.log.info("Cancelled.");
      return;
    }
  }

  // Download
  spinner.start(`Downloading ${pc.cyan(slug)}`);
  let download;
  try {
    download = await downloadSkill(slug);
  } catch (err) {
    spinner.stop(`Download failed: ${(err as Error).message}`);
    return;
  }
  spinner.stop(
    `Downloaded ${pc.green(download.filename)} (${formatBytes(download.content.length)})`,
  );

  // Install
  spinner.start(`Installing to ${scope} scope`);
  let installPath: string;
  if (download.isZip) {
    installPath = installZipBundle(scope, slug, download.content);
  } else {
    installPath = installSingleFile(scope, slug, download.content);
  }
  spinner.stop(`Installed to ${pc.dim(installPath)}`);

  // Update lock file
  addToLock({
    slug,
    name: detail.name,
    sha256: download.sha256,
    installed_at: new Date().toISOString(),
    install_path: installPath,
    is_zip: download.isZip,
  });

  p.log.success(`${pc.green("+")} ${pc.bold(detail.name)} installed successfully.`);
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
  spinner.stop(`Found ${result.total} skill(s).`);

  if (result.skills.length === 0) {
    p.log.warn("No skills found matching that query.");
    return undefined;
  }

  const selected = await p.select({
    message: "Select a skill to install:",
    options: result.skills.map((s) => ({
      value: s.slug,
      label: `${s.name} ${pc.dim(`[${s.category || "uncategorized"}]`)}`,
      hint: s.description,
    })),
  });

  if (typeof selected === "symbol") return undefined;
  return selected as string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
