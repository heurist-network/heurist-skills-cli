# @heurist-network/skills

A CLI for browsing, installing, and managing verified AI agent skills from the [Heurist Mesh](https://mesh.heurist.ai) skill marketplace.

Skills are reusable instruction sets (`SKILL.md` files) that extend coding agent capabilities. The Heurist marketplace focuses on verified, secure skills across crypto, finance, market intelligence, social data, and developer workflows: every new skill and every new version is audited before it can be installed, only `verified` skills are available through the CLI, sensitive capabilities trigger explicit warnings, and all marketplace artifacts are stored on [Autonomys](https://autonomys.xyz) decentralized storage with SHA256 integrity tracking.

## Quick Start

```bash
npx @heurist-network/skills add heurist-mesh
```

Or install globally:

```bash
npm i -g @heurist-network/skills
heurist-skills add heurist-mesh
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
heurist-skills find heurist
heurist-skills find --category Stocks
heurist-skills find                   # browse all
```

Aliases: `search`, `f`

### `list`

List installed skills or browse the marketplace.

```bash
heurist-skills list                   # project-installed skills
heurist-skills list --global          # global-installed skills
heurist-skills list --remote          # browse marketplace
heurist-skills list --remote -c Crypto # filter by category
heurist-skills list -a claude-code    # filter by agent
```

Aliases: `ls`

### `info <slug>`

Show detailed skill information including capabilities, files, and install state.

```bash
heurist-skills info heurist-mesh
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
| AdaL | `.adal/skills/` | `~/.adal/skills/` |
| Amp | `.agents/skills/` | `~/.config/agents/skills/` |
| Antigravity | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| Augment | `.augment/skills/` | `~/.augment/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cline | `.agents/skills/` | `~/.agents/skills/` |
| CodeBuddy | `.codebuddy/skills/` | `~/.codebuddy/skills/` |
| Codex | `.agents/skills/` | `~/.codex/skills/` |
| Command Code | `.commandcode/skills/` | `~/.commandcode/skills/` |
| Continue | `.continue/skills/` | `~/.continue/skills/` |
| Cortex Code | `.cortex/skills/` | `~/.snowflake/cortex/skills/` |
| Crush | `.crush/skills/` | `~/.config/crush/skills/` |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| Droid | `.factory/skills/` | `~/.factory/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Goose | `.goose/skills/` | `~/.config/goose/skills/` |
| iFlow CLI | `.iflow/skills/` | `~/.iflow/skills/` |
| Junie | `.junie/skills/` | `~/.junie/skills/` |
| Kilo Code | `.kilocode/skills/` | `~/.kilocode/skills/` |
| Kimi Code CLI | `.agents/skills/` | `~/.config/agents/skills/` |
| Kiro CLI | `.kiro/skills/` | `~/.kiro/skills/` |
| Kode | `.kode/skills/` | `~/.kode/skills/` |
| MCPJam | `.mcpjam/skills/` | `~/.mcpjam/skills/` |
| Mistral Vibe | `.vibe/skills/` | `~/.vibe/skills/` |
| Mux | `.mux/skills/` | `~/.mux/skills/` |
| Neovate | `.neovate/skills/` | `~/.neovate/skills/` |
| OpenClaw | `skills/` | `~/.openclaw/skills/` |
| OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| OpenHands | `.openhands/skills/` | `~/.openhands/skills/` |
| Pi | `.pi/skills/` | `~/.pi/agent/skills/` |
| Pochi | `.pochi/skills/` | `~/.pochi/skills/` |
| Qoder | `.qoder/skills/` | `~/.qoder/skills/` |
| Qwen Code | `.qwen/skills/` | `~/.qwen/skills/` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Trae | `.trae/skills/` | `~/.trae/skills/` |
| Trae CN | `.trae/skills/` | `~/.trae-cn/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Zencoder | `.zencoder/skills/` | `~/.zencoder/skills/` |

Agents that share `.agents/skills/` (Amp, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode) are "universal" — they read skills from the same canonical directory. Non-universal agents have their own paths and receive symlinks or copies.

The CLI auto-detects which agents are installed on your system. If one agent is found, it installs silently. If multiple are found, it prompts for selection.

## Configuration

| Variable | Description |
|----------|-------------|
| `HEURIST_SKILLS_API` | Override marketplace API URL (default: `https://mesh.heurist.xyz`) |

## Lock File Compatibility

The lock files are compatible with the [vercel/skills](https://github.com/vercel-labs/skills) format. If you have existing vercel skill entries in `~/.agents/.skill-lock.json`, they are preserved — the CLI reads and writes only its own entries without disturbing foreign entries.

## License

MIT
