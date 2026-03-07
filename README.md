# @heurist-network/skills

A CLI for browsing, installing, and managing verified AI agent skills from the [Heurist Mesh](https://mesh.heurist.ai) skill marketplace.

Skills are reusable instruction sets (`SKILL.md` files) that extend coding agent capabilities. The Heurist marketplace provides curated, verified skills for Web3, DeFi, and blockchain development — stored on [Autonomys](https://autonomys.xyz) decentralized storage.

## Quick Start

```bash
npx @heurist-network/skills add binance-web3-crypto-market-rank
```

Or install globally:

```bash
npm i -g @heurist-network/skills
heurist-skills add binance-web3-crypto-market-rank
```

## Commands

### `add <slug>`

Install a verified skill from the marketplace. Aliases: `install`

```bash
# Interactive — prompts for agent, scope, and method
heurist-skills add binance-web3-trading-signal

# Non-interactive
heurist-skills add binance-web3-trading-signal -a claude-code -g -y

# Copy instead of symlink
heurist-skills add binance-web3-spot --copy -y

# Target multiple agents
heurist-skills add binance-web3-meme-rush -a claude-code roo -y

# Interactive search (no slug)
heurist-skills add
```

| Flag | Description |
|------|-------------|
| `-a, --agent <agent...>` | Target specific agents |
| `-g, --global` | Install to global scope (`~/.agents/skills/`) |
| `--copy` | Copy files instead of symlinking |
| `-y, --yes` | Skip all confirmation prompts |

### `find [query]`

Search the skill marketplace.

```bash
heurist-skills find binance
heurist-skills find --category defi
heurist-skills find                   # browse all
```

Aliases: `search`, `f`

### `list`

List installed skills or browse the marketplace.

```bash
heurist-skills list                   # project-installed skills
heurist-skills list --global          # global-installed skills
heurist-skills list --remote          # browse marketplace
heurist-skills list --remote -c defi  # filter by category
heurist-skills list -a claude-code    # filter by agent
```

Aliases: `ls`

### `info <slug>`

Show detailed skill information including capabilities, files, and install state.

```bash
heurist-skills info binance-web3-crypto-market-rank
```

Aliases: `show`

### `remove [slug]`

Uninstall a skill. Agent-aware and orphan-safe.

```bash
heurist-skills remove binance-web3-spot -y
heurist-skills remove binance-web3-spot --global -y
heurist-skills remove binance-web3-spot -a roo -y  # remove from one agent only
heurist-skills remove                               # interactive selector
```

| Flag | Description |
|------|-------------|
| `-a, --agent <agent...>` | Remove from specific agents only |
| `-g, --global` | Target global scope |
| `--all` | Remove all installed skills |
| `-y, --yes` | Skip confirmation |

Aliases: `rm`, `uninstall`

### `check`

Check installed skills for available updates (report-only).

```bash
heurist-skills check
```

Aliases: `check-updates`, `update-check`

## Installation Scope

| Scope | Canonical Path | Lock File |
|-------|---------------|-----------|
| **Project** (default) | `.agents/skills/<slug>/` | `./skills-lock.json` |
| **Global** (`-g`) | `~/.agents/skills/<slug>/` | `~/.agents/.skill-lock.json` |

The project lock file (`skills-lock.json`) is designed to be committed to git for reproducible setups.

## Installation Methods

**Symlink** (default) — Writes skill files to a single canonical directory, then creates symlinks into each agent's native skills path. One source of truth, easy to update.

**Copy** (`--copy`) — Writes independent copies into each agent's directory. Use when symlinks are not supported.

## Supported Agents

| Agent | Project Path | Global Path |
|-------|-------------|-------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| Codex | `.agents/skills/` | `~/.codex/skills/` |
| OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| Cline | `.agents/skills/` | `~/.agents/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Continue | `.continue/skills/` | `~/.continue/skills/` |

Agents that share `.agents/skills/` (Cursor, Codex, OpenCode, Cline, Gemini CLI, GitHub Copilot) are "universal" — they read skills from the same canonical directory. Non-universal agents (Claude Code, Windsurf, Roo Code, Continue) have their own paths and receive symlinks or copies.

The CLI auto-detects which agents are installed on your system. If one agent is found, it installs silently. If multiple are found, it prompts for selection.

## Heurist-Specific Features

These features are unique to the Heurist marketplace and not present in other skills CLIs:

- **Verification gate** — Only `verified` skills can be installed. Draft and archived skills are blocked.
- **Capability warnings** — Before installing, the CLI warns about sensitive capabilities: private key access, transaction signing, leverage usage, and exchange API key requirements.
- **Decentralized storage** — Skills are stored on Autonomys Auto Drive. Each file gets its own content-addressed CID for integrity.
- **SHA256 integrity** — Download responses include `X-Skill-SHA256` for content verification and update tracking.

## Configuration

| Variable | Description |
|----------|-------------|
| `HEURIST_SKILLS_API` | Override marketplace API URL (default: `https://mesh.heurist.xyz`) |

## Lock File Compatibility

The lock files are compatible with the [vercel/skills](https://github.com/vercel-labs/skills) format. If you have existing vercel skill entries in `~/.agents/.skill-lock.json`, they are preserved — the CLI reads and writes only its own entries without disturbing foreign entries.

## License

MIT
