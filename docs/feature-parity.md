# Feature Parity: vercel/skills vs heurist-skills

Status values: **Supported** | **Out of scope** | **P1**

| Feature | vercel/skills | heurist-skills | Status |
|---|---|---|---|
| `add` — install from GitHub shorthand (`owner/repo`) | Yes | No — installs by marketplace slug | Out of scope |
| `add` — install from full URL | Yes | No — slug-based registry | Out of scope |
| `add` — install from local path | Yes | No — slug-based registry | Out of scope |
| `add -g / --global` | Yes | Yes | Supported |
| `add -a / --agent` | Yes | Yes | Supported |
| `add -s / --skill` (select specific skills from repo) | Yes | N/A — each slug is one skill | Out of scope |
| `add -l / --list` (list available before installing) | Yes | No — use `find` or `list --remote` | Out of scope |
| `add --copy` | Yes | Yes | Supported |
| `add -y / --yes` | Yes | Yes | Supported |
| `add --all` (install all skills to all agents) | Yes | No | P1 |
| `add` interactive search (no source given) | No | Yes — built into `add` | Supported |
| `list` / `ls` | Yes | Yes | Supported |
| `list --remote` (browse marketplace) | No | Yes | Supported |
| `find [query]` | Yes | Yes | Supported |
| `remove` / `rm` | Yes | Yes | Supported |
| `remove -a / --agent` (per-agent remove) | Limited | Yes — full partial remove | Supported |
| `remove --all` | Yes | Yes | Supported |
| `check` (check for updates) | Yes | Yes (`check`, `check-updates`, `update-check`) | Supported |
| `update` (auto-apply updates) | Yes | No — report-only by design | Out of scope |
| `init [name]` (create SKILL.md template) | Yes | No — consume-only | Out of scope |
| `info` / `show` (skill detail) | No | Yes | Supported |
| Agent-aware install (symlink to agent dirs) | Yes — 42+ agents | Yes — 10 agents | Supported |
| Auto-detect installed agents | Yes | Yes | Supported |
| Single-agent auto-skip prompt | Yes | Yes | Supported |
| Multi-agent multiselect prompt | Yes | Yes | Supported |
| Scope prompt (project/global) | Yes | Yes | Supported |
| Method prompt (symlink/copy) | Yes | Yes | Supported |
| Project lock file (`skills-lock.json`) | Yes | Yes | Supported |
| Global lock file (`~/.agents/.skill-lock.json`) | Yes | Yes | Supported |
| Foreign lock entry preservation | Yes | Yes | Supported |
| Verification gate (reject unverified) | No | Yes | Supported |
| Capability/risk warnings before install | No | Yes | Supported |
| SHA256 integrity tracking | No | Yes (via `X-Skill-SHA256`) | Supported |
| Skill discovery from filesystem patterns | Yes | No — registry-only | Out of scope |
| Plugin marketplace.json support | Yes | No | Out of scope |
| Telemetry (anonymous) | Yes | No | Out of scope |
| `INSTALL_INTERNAL_SKILLS` env var | Yes | No | Out of scope |
| Git SSH / GitLab source support | Yes | No — marketplace slugs only | Out of scope |

## Heurist-only features (not in vercel/skills)

- `info` / `show` command for full marketplace skill detail.
- Verification gate: blocks install unless `verification_status === verified`.
- Capability/risk warnings before install (private keys, signing, leverage, exchange keys).
- Marketplace-native remote browsing with `list --remote`.
- Registry-first install model by approved marketplace slug.
- SHA256 tracking from `X-Skill-SHA256` response header for update checks.

## Summary

| Category | Count |
|---|---|
| Supported | 23 |
| Out of scope | 13 |
| P1 | 1 (`--all` on add) |
