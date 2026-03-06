#!/usr/bin/env node
/**
 * Heurist Skills CLI — browse, install, and manage skills from the Heurist Mesh marketplace.
 *
 * Usage:
 *   heurist-skills add <slug>        Install a skill
 *   heurist-skills remove <slug>     Uninstall a skill
 *   heurist-skills list              List installed skills
 *   heurist-skills find [query]      Search marketplace
 *   heurist-skills info <slug>       Show skill details
 *   heurist-skills check-updates     Check for available updates
 *   heurist-skills help              Show this help
 */

import "dotenv/config";
import * as p from "@clack/prompts";
import pc from "picocolors";

const VERSION = "0.1.0";

const LOGO = `
${pc.cyan("██╗  ██╗███████╗██╗   ██╗██████╗ ██╗███████╗████████╗")}
${pc.cyan("██║  ██║██╔════╝██║   ██║██╔══██╗██║██╔════╝╚══██╔══╝")}
${pc.cyan("███████║█████╗  ██║   ██║██████╔╝██║███████╗   ██║")}
${pc.cyan("██╔══██║██╔══╝  ██║   ██║██╔══██╗██║╚════██║   ██║")}
${pc.cyan("██║  ██║███████╗╚██████╔╝██║  ██║██║███████║   ██║")}
${pc.cyan("╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝")}
${pc.dim(`  skills v${VERSION}`)}
`;

function printHelp(): void {
  console.log(LOGO);
  console.log(`${pc.bold("Usage:")} heurist-skills <command> [options]`);
  console.log();
  console.log(`${pc.bold("Commands:")}`);
  console.log(`  ${pc.cyan("add")} <slug>          Install a skill from the marketplace  (aliases: install)`);
  console.log(`  ${pc.cyan("remove")} <slug>       Uninstall a skill                    (aliases: rm, uninstall)`);
  console.log(`  ${pc.cyan("list")}                List project-installed skills          (aliases: ls)`);
  console.log(`  ${pc.cyan("list")} --global       List global-installed skills`);
  console.log(`  ${pc.cyan("find")} [query]        Search the skill marketplace          (aliases: search, f)`);
  console.log(`  ${pc.cyan("info")} <slug>         Show detailed skill info              (aliases: show)`);
  console.log(`  ${pc.cyan("check")}               Check for available updates           (aliases: check-updates, update-check)`);
  console.log(`  ${pc.cyan("help")}                Show this help`);
  console.log();
  console.log(`${pc.bold("Options:")}`);
  console.log(`  ${pc.dim("-g, --global")}         Use the global scope (~/.agents/skills/)`);
  console.log(`  ${pc.dim("-a, --agent <agent>")}  Target or filter specific agents`);
  console.log(`  ${pc.dim("--copy")}               Copy files instead of symlinking`);
  console.log(`  ${pc.dim("-y, --yes")}            Skip confirmation prompts`);
  console.log(`  ${pc.dim("--category, -c")}       Filter by category (use with find/list --remote)`);
  console.log(`  ${pc.dim("--search, -s")}         Filter by search term (use with list --remote)`);
  console.log();
  console.log(`${pc.bold("Environment:")}`);
  console.log(`  ${pc.dim("HEURIST_SKILLS_API")}   Override marketplace API URL`);
  console.log(`                       ${pc.dim("(default: https://mesh.heurist.ai)")}`);
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  p.intro(pc.cyan("heurist-skills"));

  try {
    switch (command) {
      case "add":
      case "install": {
        const { addCommand } = await import("./commands/add.ts");
        await addCommand(commandArgs);
        break;
      }
      case "remove":
      case "uninstall":
      case "rm": {
        const { removeCommand } = await import("./commands/remove.ts");
        await removeCommand(commandArgs);
        break;
      }
      case "list":
      case "ls": {
        const { listCommand } = await import("./commands/list.ts");
        await listCommand(commandArgs);
        break;
      }
      case "find":
      case "f":
      case "search": {
        const { findCommand } = await import("./commands/find.ts");
        await findCommand(commandArgs);
        break;
      }
      case "info":
      case "show": {
        const { infoCommand } = await import("./commands/info.ts");
        await infoCommand(commandArgs);
        break;
      }
      case "check":
      case "check-updates":
      case "update-check": {
        const { checkUpdatesCommand } = await import("./commands/check-updates.ts");
        await checkUpdatesCommand(commandArgs);
        break;
      }
      default:
        p.log.error(`Unknown command: ${pc.red(command)}`);
        console.log();
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    p.log.error((err as Error).message);
    process.exit(1);
  }

  p.outro(pc.dim("Done."));
}

main();
