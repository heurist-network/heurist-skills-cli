# QA Test Commands — P0 Agent-Aware CLI

This checklist is for the new P0 CLI behavior:

- local installs go to `.agents/skills/`
- global installs go to `~/.agents/skills/`
- install is agent-aware
- `list` is scope-aware
- `remove` is orphan-safe and agent-aware
- `check-updates` reads both project and global install state

## Setup

Use a scratch project so local installs and `skills-lock.json` do not pollute the CLI repo itself.

```bash
export HEURIST_SKILLS_API=http://localhost:8005
export HEURIST_SKILLS_CLI=/home/appuser/heurist-skills-cli/src/cli.ts

mkdir -p /tmp/heurist-skills-qa
cd /tmp/heurist-skills-qa
```

> **Note:** `tsx` must be loaded via its absolute `file://` path because the scratch dir has no
> `node_modules`. Define a shell function to avoid repeating the long invocation:
>
> ```bash
> hs() { node --import "file:///home/appuser/heurist-skills-cli/node_modules/tsx/dist/esm/index.mjs" "$HEURIST_SKILLS_CLI" "$@"; }
> ```
>
> All commands below use `hs` as the shorthand. Equivalent long form:
> `node --import "file:///home/appuser/heurist-skills-cli/node_modules/tsx/dist/esm/index.mjs" "$HEURIST_SKILLS_CLI" ...`

## 1. Basic CLI surface

```bash
hs --help
hs --version
```

## 2. Browse marketplace

```bash
hs list --remote
hs list --remote --category defi
hs list --remote --search binance
hs list --remote -c defi -s binance
```

## 3. Inspect skill detail

```bash
hs info binance-web3-crypto-market-rank
hs info qrcoin
hs info nonexistent-skill
```

## 4. Local install flow

Default local install:

```bash
hs add binance-web3-crypto-market-rank
```

Non-interactive local install:

```bash
hs add binance-web3-crypto-market-rank --yes
```

Explicit agent targeting:

```bash
hs add binance-web3-crypto-market-rank -a claude-code --yes
hs add binance-web3-crypto-market-rank -a roo --yes
```

Copy mode:

```bash
hs add binance-web3-crypto-market-rank -a claude-code --copy --yes
```

Verified-only gate:

```bash
hs add qrcoin
hs add nonexistent-skill
```

## 5. Global install flow

```bash
hs add binance-web3-trading-signal --global
hs add binance-web3-trading-signal --global --yes
hs add binance-web3-trading-signal --global -a claude-code --yes
hs add binance-web3-trading-signal --global -a claude-code --copy --yes
```

## 6. Listing installed state

Project scope:

```bash
hs list
hs list -a claude-code
hs list -a roo
```

Global scope:

```bash
hs list --global
hs list --global -a claude-code
```

Remote list should show installed badge when applicable:

```bash
hs list --remote --search binance-web3-crypto-market-rank
```

## 7. Update check

```bash
hs check-updates
```

## 8. Remove flow

Remove a project install:

```bash
hs remove binance-web3-crypto-market-rank --yes
```

Remove a global install explicitly:

```bash
hs remove binance-web3-trading-signal --global --yes
```

Important regression test: remove a global install without passing `--global`.
This should still remove the actual installed copy instead of orphaning files.

```bash
hs add binance-web3-trading-signal --global --yes
hs remove binance-web3-trading-signal --yes
```

Unknown slug:

```bash
hs remove nonexistent-skill --yes
```

Interactive selector:

```bash
hs remove
```

## 9. Agent-specific remove

Install to multiple agents, then remove only one agent target.

```bash
hs add binance-web3-crypto-market-rank -a claude-code roo --yes
hs list
hs remove binance-web3-crypto-market-rank -a roo --yes
hs list
hs remove binance-web3-crypto-market-rank -a claude-code --yes
```

## 10. Interactive install

Search flow:

```bash
hs add
```

## 11. Optional filesystem spot checks

After local install:

```bash
find .agents .claude .roo -maxdepth 3 -type d 2>/dev/null | sort
ls -la skills-lock.json 2>/dev/null
```

After global install:

```bash
find ~/.agents ~/.claude ~/.roo -maxdepth 3 -type d 2>/dev/null | sort
ls -la ~/.agents/.skill-lock.json 2>/dev/null
```

## 12. API failure handling

```bash
HEURIST_SKILLS_API=http://localhost:9999 hs list --remote
HEURIST_SKILLS_API=http://localhost:9999 hs add binance-web3-crypto-market-rank
```
