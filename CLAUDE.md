# CLAUDE.md — altimist-com-router

<!-- Altimist Baseline v5 — START -->

## Working Principles

Behavioural guidelines for coding work. Bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports, variables, and functions that *your* changes made unused. Leave pre-existing dead code alone unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform vague tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

    1. [Step] → verify: [check]
    2. [Step] → verify: [check]
    3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Spec-First for Substantial Features

Before implementing a substantial feature, check for an existing spec in `docs/specs/`. If none exists, propose drafting one with the user before writing code.

**A feature is "substantial" if it meets any of these:**

- Touches multiple layers (UI + API + DB)
- Adds a new user-facing capability
- Requires a data model change or new database table
- Requires a new API endpoint or external integration
- Will likely take more than ~2 hours of focused work
- Affects security, auth, or permissions

**Trivial work that doesn't need a spec:** bug fixes restoring intended behaviour, refactors with no behavioural change, copy/typo edits, single utility functions, dependency bumps.

**When unsure, ask the user:** *"This feels substantial — should I draft a spec in `docs/specs/` first?"*

**For projects without a `docs/specs/` folder:** the spec-first rule doesn't apply — use the project's own conventions.

## Git Workflow

### Protected branches

- **`main`** is protected on every Altimist repo. Never push directly.
- **`staging`** is additionally protected on Vercel-deployed projects (see Review & Preview Workflow).
- All other branches (feature branches, topic branches, experiments) are unrestricted — any team member can push to them freely.

We recommend configuring **GitHub branch protection rules** on each repo to enforce this mechanically: require PRs into `main` (and `staging` for Vercel projects), block direct pushes, optionally require status checks. The CLAUDE.md rule is the convention; branch protection is the belt-and-braces.

### Workflow

- Branch from `main` (or `staging` for Vercel projects, when targeting staging) → commit → push → open PR → review → merge.
- Before opening a PR, check the repo status and the latest PRs to avoid duplicates. Gathering information (`git status`, `gh pr list`, etc.) never requires confirmation.

### Who creates PRs and who merges

- **Non-Vercel projects:** any team member can open PRs and merge. **Self-merge is allowed** after review — the PR is the visible, traceable record. Small teams trade "two pairs of eyes" for velocity; the spec, test suite, and PR diff serve as the quality signal. Add a reviewer when the change is risky or you want a second opinion.
- **Vercel-deployed projects:** PRs into `staging` and `main` must be **authored AND merged by a Vercel team member** (Nathan or altimistDEV). Vercel checks the PR author to decide whether to deploy — see Review & Preview Workflow. Other contributors push to feature branches; a Vercel team member opens the PR on their behalf.

### State verification

- **Verify remote state before claiming it.** Once a PR is opened or work is pushed, its state (open / merged / closed; branch position; deploy status) is unknown until observed — anyone with merge rights may have acted on it. Before saying *"the PR is open"* or *"main hasn't moved"*, run the check (`gh pr view <n>`, `gh pr list`, `git fetch`). Cheap to verify; expensive to be wrong.
- **Pull latest before pushing.** Upstream may have moved while you were working. Run `git fetch` and rebase or merge the latest target branch into your feature branch before pushing, to avoid landing on a stale base.

## Documentation

Every material change should leave the project's documentation accurate.

**Before opening a PR, verify whether your change needs to update:**

- **README** — install steps, commands, env vars, supported features
- **Architecture docs** — how components fit together, decisions and trade-offs
- **Specs** — if the project uses spec-driven development (e.g. `docs/specs/`)
- **Inline comments** — only where the code is genuinely non-obvious

**What counts as material:**

- New feature, API endpoint, env var, CLI command, or config option
- Behaviour change visible to users or other developers
- Architecture change (new component, removed dependency, changed data flow)

**What doesn't:** bug fixes restoring intended behaviour, refactors with no behavioural change, tests for existing behaviour, typos, formatting.

If a needed doc lives in another repo, open a follow-up issue and link it from the PR.

## Review & Preview Workflow (Vercel-deployed projects)

Altimist uses a dedicated `staging` branch for pre-production testing on Vercel projects. This exists because Vercel only generates preview URLs for pushes from Vercel team members. Since only **Nathan** and **altimistDEV** hold Vercel seats (deliberate, for cost), per-PR preview URLs are unavailable for most contributors — testing happens on the shared staging deployment instead.

- Developers commit and push to their own feature branches as normal.
- **No one pushes directly to `staging` or `main`.** Both are protected.
- **PRs into `staging` must be authored AND merged by a Vercel team member** (Nathan or altimistDEV) — Vercel checks the PR author, not the merger. If a non-member authors the PR, the deployment won't trigger. The team member opens the PR on the developer's behalf, using their feature branch.
- Merging to `staging` deploys to the project's staging subdomain (e.g. `staging.<prod-domain>`).
- Reviewers exercise the change on the staging URL before approving.
- When `staging` is validated, a Vercel team member opens a PR from `staging` to `main` and merges.
- Merging to `main` triggers the production deploy.

**Constraint:** `staging` must always be deployable. Never merge a broken feature into `staging` — it's shared, and a broken staging blocks everyone else's testing.

**Drift between `staging` and `main` is benign.** After merging `staging` → `main`, the new merge commit on `main` means `staging` is "1 commit behind" — but that commit is the merge itself; file contents are identical. The next `staging` → `main` PR will reconcile cleanly without any prior sync. Don't run post-release `main` → `staging` syncs as routine housekeeping.

Projects that don't deploy to Vercel (e.g. CLI packages, Databricks workloads, Docker services) may use a simpler flow — see the project's own `CLAUDE.md` for specifics.

<!-- Altimist Baseline v5 — END -->

## Project

`altimist-com-router` is a Cloudflare Worker that owns request routing for the `altimist.com` zone (and `*.altimist.com` wildcard). Its job is small: dispatch `/.well-known/*` requests to [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API, return 404 for non-matching `.well-known/*` paths, and stay out of the way of everything else (which the CF route pattern leaves alone — the Worker only sees requests matching its bound routes).

Phase 2a of [F-010](https://github.com/altimist/altimist-id/blob/main/docs/specs/F-010-finternet-native-identity-phase-2a.md). Decision rationale in [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md). Topology comparison in [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md) (Option W).

The Worker code itself is ~20 LOC; nearly all logic lives in [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) (the `routeResolverRequest` export). This repo is glue + config + deploy plumbing.

## Stack

- **Cloudflare Workers** (Free tier; <100 LOC of dispatch logic)
- **TypeScript 5**, ESM-only
- **`@altimist/did-publisher` v0.2+** for the dispatch + proxy logic
- **Wrangler** for dev / build / deploy
- **Vitest** for unit tests (mocks `globalThis.fetch`)

## Commands

```bash
npm install
npm test                # vitest
npm run typecheck       # tsc --noEmit
npm run dev             # wrangler dev (local)
npm run deploy:staging
npm run deploy:production
```

## Configuration

Environment variables are set per-environment in [`wrangler.toml`](./wrangler.toml):

| Variable | Purpose | Staging | Production |
|---|---|---|---|
| `ALTIMIST_ID_ORIGIN` | Base URL for altimist-id Resolver API | `https://staging.id.altimist.ai` | `https://id.altimist.ai` |
| `ALTIMIST_ID_APEX` | Host treated as "no handle here" | `staging.altimist.com` | `altimist.com` |

CI deploy needs a `CLOUDFLARE_API_TOKEN` GitHub secret (Workers-scoped). See [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

## Routing topology

The Worker is bound to CF routes via `wrangler.toml` (currently commented out — bind manually during the staging-W testbed rollout, then enable here once stable).

**Production target:**
- `*.altimist.com/.well-known/*` → Worker
- `altimist.com/.well-known/*` → Worker
- Everything else on `*.altimist.com` and `altimist.com` → corporate-website-v2 unchanged (the Worker doesn't see these requests)

**Staging target:**
- `*.staging.altimist.com/.well-known/*` → Worker
- `staging.altimist.com/.well-known/*` → Worker

The phased rollout means the Worker route pattern is *only* for `.well-known/*`. Non-`.well-known` requests bypass the Worker entirely and continue routing to corporate-website-v2 via the existing CNAME.

## Deployment

This repo is **NOT a Vercel project.** The Vercel-specific sections of the baseline above (per-PR preview URLs, Vercel team-author requirement) don't apply. Simpler flow:

- Anyone can author + merge PRs into `staging` and `main`.
- `staging` branch deploys to `altimist-com-router-staging` Worker via the deploy workflow.
- `main` branch deploys to `altimist-com-router-production` Worker.
- Branch protection on `main` (and ideally `staging`) recommended; configure in GitHub repo settings.

Local dev:

```bash
wrangler login                # one-time, opens browser
npm run dev                   # http://localhost:8787
curl -H "Host: patrick.staging.altimist.com" http://localhost:8787/.well-known/did.json
```

## What this Worker does NOT do

- Generate any DID document content (altimist-id is the source of truth)
- Cache state itself (Cloudflare's edge cache handles this; the Worker just sets `Cache-Control` headers via the upstream proxy)
- Authenticate or rate-limit requests (these are altimist-id's job, or future Worker extensions)
- Handle any path that isn't `/.well-known/did.json`, `/.well-known/revocations.json`, or `/.well-known/team-issuers/<team>.json` — those return 404
