# QA Report — heurist-skills-cli

---

## Session 1 — v0.1.0 baseline (2026-03-05)

**Environment:** `HEURIST_SKILLS_API=http://localhost:8005`
**Runtime:** `node --import tsx/esm src/cli.ts`

### Test Coverage

| Feature | Status | Notes |
|---|---|---|
| `help` / `--help` / `-h` | PASS | Renders correctly |
| `--version` / `-v` | PASS | Returns `0.1.0` |
| `list --remote` | PASS | Lists all 13 verified skills |
| `list --remote --category defi` | PASS | Filters correctly (7 results) |
| `list --remote --search binance` | PASS | Filters correctly |
| `list --remote -c defi -s binance` | PASS | Short flags work |
| `list` (local, empty) | PASS | Shows helpful empty state message |
| `list` (local, with installs) | PASS | Displays slug, name, path, sha256 |
| `info <slug>` | PASS | Files listed without size rendering |
| `info` (no slug) | PASS | Shows usage error |
| `info <nonexistent>` | PASS | Reports not found, exits 0 |
| `add <slug>` | PASS | Installs to local `.heurist/skills/` |
| `add <slug> --global` | PASS | Installs to `~/.heurist/skills/` |
| `add` (already installed) | PASS | Prompts for reinstall confirmation |
| `add <nonexistent>` | PASS | Exits non-zero on failure |
| `add --yes` | PASS | Skips add confirmation prompts |
| `remove <slug> --yes` | PASS | Removes skill and lock entry |
| `remove <slug> --global --yes` | PASS | Removes global install |
| `check-updates` | PASS | Reports update status |

### Bugs Found

| ID | Severity | Description |
|---|---|---|
| BUG-01 | Medium | `info` shows `NaN MB` for file sizes — API returns `{cid, gateway_url}` not `size` |
| BUG-02 | High | `remove <slug>` without `--global` orphans globally-installed files |
| BUG-03 | Low | `remove <nonexistent>` cleans lock entry silently instead of reporting not installed |
| BUG-04 | Medium | `add <nonexistent>` exits 0 instead of non-zero |
| BUG-05 | Medium | `list --category --search` parses `--search` as the category value |
| BUG-06 | High | `add <draft-skill>` proceeds past fetch before checking verification status |
| BUG-07 | High | `add --yes` does not suppress the capabilities confirmation prompt |

### UX Issues Found

| ID | Description |
|---|---|
| UX-01 | `list` with no installs shows no path context (which scope is being shown) |
| UX-02 | `info <nonexistent>` exits 0 — should exit 1 |
| UX-03 | Command aliases (`install`, `rm`, `ls`, `show`) not documented in help |
| UX-04 | `list --remote` spinner says "Found N skills" using `total` not `skills.length` |

---

## Session 2 — qrcoin draft skill discovery (2026-03-05)

New skill `qrcoin` added with `verification_status: draft`.

| Test | Result |
|---|---|
| `list --remote` | `qrcoin` NOT shown (correct — draft excluded from marketplace listing) |
| `info qrcoin` | Shows `status: draft`, capabilities, NaN file size (BUG-01) |
| `add qrcoin` | Blocked with "cannot be installed" before any other prompts (BUG-06 verified) |

---

## Session 3 — qrcoin post-approval (2026-03-05)

`qrcoin` approved (`verification_status: verified`).

| Test | Result |
|---|---|
| `list --remote` | `qrcoin` now visible with `[defi] risk:medium`, caps: `private-keys, sign-tx` |
| `list --remote --search qrcoin` | Returns 1 result |
| `info qrcoin` | `status: verified`, NaN MB persists (BUG-01 unfixed) |
| `add qrcoin` (interactive) | Blocked at capabilities prompt — `--yes` does not help (BUG-07) |
| `add qrcoin` (internal bypass) | Install succeeded via direct API + installer module invocation |
| `list` (local, after install) | Shows qrcoin with path and sha256 |
| `list --remote` (after install) | Shows `[installed]` badge next to qrcoin |
| `check-updates` (after install) | Reports "All skills are up to date" |
| `remove qrcoin --yes` | Removes correctly |

---

## Session 4 — P0 agent-aware rewrite (2026-03-06)

**Branch:** `main` (all changes unstaged against the initial release commit)
**Test dir:** `/tmp/heurist-skills-qa` (separate scratch dir for project installs)
**Runner:** `node --import "file:///home/appuser/heurist-skills-cli/node_modules/tsx/dist/esm/index.mjs" /home/appuser/heurist-skills-cli/src/cli.ts`

### P0 Success Criteria — all PASS

| Criterion | Result |
|---|---|
| `add <slug>` installs into agent-readable directories | PASS |
| Agent detection, scope prompt, symlink/copy prompt | PASS |
| `--yes` suppresses all prompts including capabilities | PASS |
| `remove` does not orphan on scope mismatch (BUG-02 regression) | PASS |
| `list` shows per-agent installed state | PASS |
| Project and global installs tracked in separate lock files | PASS |
| `check-updates` reads both lock files, remains report-only | PASS |

### Section-by-section results

#### 1. Help and version

```
heurist-skills --help
```
PASS. New flags (`-a/--agent`, `--copy`, updated `--global` description) present. `list --global` documented.

#### 2. Browse marketplace

| Command | Result |
|---|---|
| `list --remote` | PASS — 14 verified skills shown |
| `list --remote --category defi` | PASS — 8 skills |
| `list --remote --search binance` | PASS — binance skills returned |
| `list --remote -c defi -s binance` | PASS — short flags work (BUG-05 fixed) |

#### 3. Info

| Command | Result |
|---|---|
| `info binance-web3-crypto-market-rank` | PASS — shows capabilities, files (no NaN, BUG-01 fixed) |
| `info qrcoin` | PASS — shows `status: verified`, caps: private-keys, sign-tx |
| `info nonexistent-skill` | PARTIAL — prints "not found" but exits 0 (UX-02 not fixed, still exits 0) |

#### 4. Local install

| Command | Result |
|---|---|
| `add binance-web3-crypto-market-rank --yes` | PASS — detects claude-code, installs canonical to `.agents/skills/`, symlink at `.claude/skills/` |
| `add ... -a claude-code --yes` | PASS — installs to claude-code + all universal agents |
| `add ... -a roo --yes` | PASS — installs to roo + universal agents, creates `.roo/skills/` symlink |
| `add ... -a claude-code --copy --yes` | PASS — copy to `.claude/skills/`, summary shows per-agent paths |
| `add qrcoin --yes` (verified, has caps) | PASS — shows caps warning, skips prompt with `--yes`, installs |
| `add nonexistent-skill --yes` | PASS — exits 1 with "not found" (BUG-04 fixed) |

**Filesystem verified after `--yes` local install:**
```
.agents/skills/binance-web3-crypto-market-rank/SKILL.md   ← canonical
.claude/skills/binance-web3-crypto-market-rank            ← symlink → ../../.agents/skills/...
skills-lock.json                                          ← project lock
```

Lock entry includes `install_method`, `canonical_path`, `agent_installs` per-agent with `kind: canonical|symlink|copy`.

**UX observation:** `-a claude-code --yes` shows 7 agents in summary (all universal agents are always added via `ensureUniversalAgents`). This is consistent with vercel/skills behavior but may surprise users who expect only `claude-code` to appear. Not a bug — universal agents share `.agents/skills/` and cost nothing extra.

#### 5. Global install

| Command | Result |
|---|---|
| `add binance-web3-trading-signal --global --yes` | PASS — canonical at `~/.agents/skills/`, symlink at `~/.claude/skills/` |
| `add ... --global -a claude-code --yes` | PASS |
| `add ... --global -a claude-code --copy --yes` | PASS — copy to `~/.claude/skills/`, not a symlink |

Global lock written to `~/.agents/.skill-lock.json` alongside pre-existing vercel/skills entries. Foreign entries (vercel format) are preserved and not surfaced to heurist commands.

#### 6. Listing

| Command | Result |
|---|---|
| `list` (project) | PASS — shows 2 skills with canonical path and agent list |
| `list -a claude-code` | PASS — both skills shown (both have claude-code) |
| `list -a roo` | PASS — "No skills matched" after roo was cleaned up by a subsequent reinstall |
| `list --global` | PASS — shows 1 global skill |
| `list --global -a claude-code` | PASS — filters correctly |
| `list --remote --search binance-web3-crypto-market-rank` | PASS — returns 1 result with `[installed]` badge (BUG-08 fixed server-side, Session 5) |

#### 7. check-updates

PASS — reads both project (`skills-lock.json`) and global (`~/.agents/.skill-lock.json`) entries, deduplicates by slug+sha256, reports "All skills are up to date".

#### 8. Remove

| Command | Result |
|---|---|
| `remove binance-web3-crypto-market-rank --yes` | PASS — removes canonical + all agent symlinks, removes lock entry |
| `remove binance-web3-trading-signal --global --yes` | PASS |
| **BUG-02 regression:** `add --global`, then `remove` without `--global` | PASS — finds global entry in lock, removes correctly, no orphan |
| `remove nonexistent-skill --yes` | PASS — "not installed" warning, exits 0 (BUG-03 fixed) |

#### 9. Per-agent remove

```bash
add binance-web3-crypto-market-rank -a claude-code roo --yes  # install to 2 non-universal agents
remove ... -a roo --yes                                        # remove only roo
```

| Check | Result |
|---|---|
| After `remove -a roo`: canonical still exists | PASS — universal agents still reference it |
| After `remove -a roo`: roo symlink removed | PASS |
| After `remove -a roo`: lock updated to remove roo, retain others | PASS |
| `list` after partial remove | PASS — shows remaining agents correctly |
| CLI message | PASS — "updated (local); remaining agents: Cursor, Codex, ..." |

**Orphan-safety confirmed:** canonical is only deleted when no remaining agents have `kind != "copy"` entries.

#### 12. API failure handling

| Command | Result |
|---|---|
| `HEURIST_SKILLS_API=http://localhost:9999 list --remote` | PASS — "fetch failed", exits 1 |
| `HEURIST_SKILLS_API=http://localhost:9999 add ...` | PASS — "fetch failed", exits 1 |

### Bugs Fixed in P0 rewrite

| ID | Fixed? |
|---|---|
| BUG-01 (NaN file size) | PASS — `f.size` removed, file sizes no longer displayed |
| BUG-02 (orphan on scope mismatch) | PASS — remove reads lock, not scope flag |
| BUG-03 (silent lock cleanup for unknown slugs) | PASS — prints "not installed" warning |
| BUG-04 (`add <nonexistent>` exits 0) | PASS — throws, exits 1 |
| BUG-05 (broken flag parsing in list) | PASS — rewritten with index-based parser |
| BUG-06 (verification check after fetch) | PASS — checked immediately after `getSkill()` |
| BUG-07 (`--yes` doesn't suppress capabilities prompt) | PASS — `skipConfirm` gates capabilities prompt |

### New issues found in Session 4

| ID | Severity | Description |
|---|---|---|
| BUG-08 | Low | ~~`list --remote --search <full-slug>` returns 0 results~~ — **fixed server-side (Session 5)** |
| UX-05 | Low | `info <nonexistent>` still exits 0 — `infoCommand` does not call `process.exit(1)` on 404 |
| UX-06 | Low | `-a <agent> --yes` summary shows all universal agents in addition to the specified agent, which may surprise users expecting to see only their specified target |
