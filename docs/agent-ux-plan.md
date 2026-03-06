# Plan: Heurist Skills CLI P0 UX Alignment

## Goal

Make `heurist-skills` feel familiar to users of `npx skills` while keeping implementation risk low.

For P0, the priority is not to re-design a new installer architecture inside the current CLI. The
priority is to reuse Vercel's existing agent-aware install/remove/list/lock primitives and adapt
them to Heurist's marketplace API and skill slug model.

This keeps the work aligned with the backend requirements:

- install approved skills from `GET /skills/:slug/download`
- install into directories real coding agents already read
- preserve controlled updates from Heurist's registry
- avoid shipping non-essential workflow features before the core install path works

---

## Product constraints from backend requirements

The marketplace requirements already narrow the CLI scope for P0:

- Heurist is forking the Vercel CLI and pointing it at the Heurist registry API
- P0 commands are `add`, `list`, `remove`, and `check-updates`
- the backend controls approved versions
- automatic upstream sync is explicitly out of scope for P0

Implication: the CLI should behave like Vercel where that improves install UX, but we should not
add extra command surface area or custom state models that go beyond P0.

---

## Implementation strategy

### 1. Copy over Vercel's existing primitives

Do not rebuild these from scratch in the current minimal CLI.

Copy over, with minimal adaptation:

- `agents.ts` and agent detection helpers
- installer primitives for canonical install paths, per-agent paths, symlink fallback, and safe path handling
- list/remove helpers that understand canonical installs and agent-specific links
- the split lock model:
  - project `skills-lock.json`
  - global `~/.agents/.skill-lock.json`

Heurist-specific behavior should be layered on top of those primitives, not reimplemented beside them.

### 2. Keep Heurist-specific code narrow

Only adapt the parts that are marketplace-specific:

- fetch skill metadata from Heurist API
- fetch install artifact from `GET /skills/:slug/download`
- block installation unless `verification_status === "verified"`
- display Heurist capability/risk warnings before install
- send installed hashes to Heurist `POST /check-updates`

The agent/layout/lock behavior should stay close to upstream unless there is a Heurist-specific reason to differ.

---

## P0 scope

### P0.1 Install into agent-readable directories

This is the biggest current UX gap. Today the CLI installs into `.heurist/skills/`, which no agent
reads.

P0 change:

- local canonical install path: `.agents/skills/<slug>/`
- global canonical install path: `~/.agents/skills/<slug>/`
- non-universal agents get symlinks into their native skill directories
- copy mode remains available when symlinks are not desired or fail

Use Vercel's existing path-safety and symlink behavior rather than writing a new installer.

### P0.2 Add agent-aware `add` flow

Support the install flow users expect, but only for Heurist marketplace slugs.

Required behavior:

- `-a, --agent <agent>` support
- detect installed agents automatically
- if one agent is detected, skip the prompt
- if multiple agents are detected, prompt with those preselected
- if none are detected, show the supported agent list
- prompt for project vs global scope unless `--global` or `--yes` is passed
- prompt for symlink vs copy unless `--copy` or `--yes` is passed
- show a concise installation summary before writing files unless `--yes` is passed

Required guardrails:

- reject unverified skills before install prompts continue
- preserve capability warnings
- `--yes` must suppress all confirmation prompts
- missing skill must exit non-zero

### P0.3 Make `remove` agent-aware and orphan-safe

Current remove behavior is unsafe because it assumes the caller passed the original scope.

P0 change:

- remove by reading installed state, not by trusting the CLI scope flag alone
- support `-a, --agent <agent>` to remove from specific agents
- clean up agent-specific symlinks/copies first
- remove the canonical directory only when no remaining agent references it
- only remove lock entries when cleanup actually succeeded
- return a clear "not installed" error for unknown slugs

### P0.4 Make `list` reflect real installed state

`list` should report where the skill is actually installed and which agents can see it.

P0 behavior:

- show canonical path
- show linked agents
- support `-a, --agent <agent>` filter
- for remote listing, fix the count mismatch by displaying the number of results actually shown

We do not need full plugin/source grouping for P0.

### P0.5 Use the right lock-file split

P0 should adopt Vercel's separation of concerns instead of extending the current single global lock.

Project installs:

- write `./skills-lock.json`
- this is the reproducible, git-committable project lock

Global installs:

- write `~/.agents/.skill-lock.json`
- this is used for global install metadata and update tracking

Important constraint:

- do not dual-write project installs into the global lock file

The current single global map keyed by slug is not sufficient to represent project installs across
multiple repos and should not be stretched further.

### P0.6 Keep `check-updates` report-only

For P0, `check-updates` remains a reporting command:

- send installed hashes to Heurist backend
- show approved updates that are available
- do not auto-apply updates

This matches the marketplace requirement that approved versions come from Heurist and keeps update
behavior conservative in the MVP.

---

## Explicitly out of P0

These items are reasonable, but they are not needed to close the main UX gap and should not block
the first release.

### P1 items

- `update` / `upgrade` command that auto-reinstalls outdated skills
- `init` command for authoring new skills
- remembered last-selected agents
- broader install shorthands like `--all`
- richer grouping in `list` by plugin/source
- extra one-time post-install suggestion flows

These can be layered on after the core install/remove/list/check behavior is stable.

---

## Proposed work order

### Phase 1: copy upstream primitives

Import the Vercel primitives for:

- agent registry and detection
- canonical install layout
- symlink/copy installer behavior
- agent-aware list/remove behavior
- project/global lock files

Do this first so the rest of the CLI can target a stable installation model.

### Phase 2: adapt `add` to Heurist marketplace

Implement Heurist-specific install flow on top of those primitives:

- fetch skill by slug
- enforce verified-only install
- warn on sensitive capabilities
- download approved artifact
- install using upstream-style agent primitives

### Phase 3: align management commands

After installs are correct:

- update `remove`
- update `list`
- update `check-updates`
- update help text and docs to reflect the new paths and flags

---

## Success criteria for P0

P0 is done when all of the following are true:

- `heurist-skills add <slug>` installs into directories that agents actually read
- `heurist-skills add` supports agent selection, scope selection, and symlink/copy selection
- `heurist-skills remove` does not orphan files when scope is omitted or mismatched
- `heurist-skills list` shows per-agent installed state
- project installs and global installs are tracked separately with the correct lock files
- `check-updates` reports approved updates from Heurist without auto-applying them

Anything beyond that is P1 unless it is required to make those behaviors correct.
