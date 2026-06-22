# CLAUDE.md — altimist-com-router

<!-- Altimist Baseline v7 — START -->

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

## Altimist Claude Code tooling

The [Altimist plugin](https://github.com/altimist/altimist-claude-plugin) ships team skills plus a verification gate. When it's installed (one-time setup: `altimist-claude-config/docs/runbooks/install-plugin.md`), prefer it over hand-rolling:

- **Spec a feature** → `/create-feature-spec` (interview → user stories, goals, acceptance criteria), then `/implement-spec` for the red→green→refactor loop — the easiest way to satisfy the **Spec-First** rule above.
- **Second opinion on a change** → `/review` — spec-aware adversarial review; `--codex` / `--both` adds a cross-vendor pass.
- **Read a PDF / Word doc** → `/doc2md` (see the **Reading Documents** section).
- **Verification gate** — runs the project's typecheck → lint → test before a code-changing turn can finish, and blocks until they pass (`VERIFY_OFF=1` bypasses for a session). Makes **Goal-Driven Execution** a mechanism, not a reminder.

If the plugin isn't installed these skills won't resolve — install it once per machine and restart Claude Code.

## Loop & Autonomy Guardrails

These apply whenever a session runs work in a **loop** — `/loop`, `/goal`, a scheduled routine, or fanning out sub-agents — i.e. any time an *agent*, not a human, decides the next action. A loop is not a cron job: a script runs fixed steps; a loop reads state, picks the next action, checks the result, and decides whether to continue, retry, or stop. Without the guardrails below it isn't a loop — it's a token furnace.

**Never start a loop without all three:**

- **A verifiable "done."** An objective stop target — "tests X pass", "CI green", "reviewer confirms criterion N" — never "until it looks right." A fuzzy goal makes the loop optimise toward a fake target. The spec's acceptance criteria are the goal; the verify gate and `/review` are how it's checked.
- **A separate checker.** Verification stronger than the agent's own say-so — the verify gate (typecheck→lint→test) and the adversarial `spec-reviewer`. The actor and the checker must not be the same judgement.
- **Hard breaks.** A max-iteration cap, no-progress detection (stop if N rounds change nothing), and a token/$ budget stated up front. Log spend; review it. Cost is part of the design, not an afterthought.

**Keep the human at the decisions that matter:**

- **Approve, don't trigger.** Removing yourself from the *trigger* is the point; staying at *approval* for anything that spends money or can't be undone is not — provisioning paid resources, production deploys, and outbound external comms always stop for a human (the same gate as "Vercel = Nathan/altimistDEV only" and confirming outward-facing actions).
- **Start simple, earn autonomy.** A solo loop with good verification beats a swarm for almost everything. Run a loop manually-triggered and monitored until it has proven itself; only then schedule it. Add autonomy when it pays for itself, not before.

Full rationale and the routine catalogue: [`altimist-strategy/research/loop-engineering-2026.md`](https://github.com/altimist/altimist-strategy/blob/main/research/loop-engineering-2026.md).

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

## Reading Documents (.pdf / .docx)

Don't Read `.pdf` or `.docx` files directly — PDFs cost ~1,500–3,000 tokens **per page** (read as page images), and docx isn't natively readable at all. Convert to Markdown first and read/grep the `.md` sidecar (`spec.pdf` → `spec.pdf.md`): run `/doc2md <file>` (PDF → pymupdf4llm, docx → MarkItDown — fixed rules, see the plugin's `docs/specs/F-001-doc2md.md`). With the Altimist plugin (≥ 0.9.0) installed, a hook **auto-redirects `.pdf` reads**; **`.docx` is not auto-redirected** — Claude Code's Read rejects `.docx` as binary before the hook can run, so **always `/doc2md` a docx first**, then read the `.md`. `DOC2MD_OFF=1` opts out, and a Read with an explicit `pages` parameter bypasses it for intentional visual reads (figures, scans).

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

**Drift between `staging` and `main` is structural, not content-level.** With `--merge`-style PRs, after each `staging` → `main` promotion `staging` shows as N commits behind `main` (the merge commits themselves), but file contents match exactly. This is the steady state — do **not** run post-release `main` → `staging` syncs as routine housekeeping. They create commit churn without changing any file.

**Exception — when `staging` → `main` shows real conflicts:**

- **Trigger:** parallel feature streams have both landed on `main` while bypassing each other's `staging` (e.g. a hotfix went direct to `main` while another feature was going through `staging`).
- **Action:** do a one-time `main` → `staging` merge on the `staging` branch, resolve conflicts in favour of `staging`'s prose where it documents current deployed reality, push the merge commit, then proceed with the `staging` → `main` PR.
- **Trail:** mention "one-time backflow" in the merge commit message so future readers understand the exception isn't routine.

Projects that don't deploy to Vercel (e.g. CLI packages, Databricks workloads, Docker services) may use a simpler flow — see the project's own `CLAUDE.md` for specifics.

## Source of truth — Altimist strategy

Strategic context for this repo lives in [`altimist/altimist-strategy`](https://github.com/altimist/altimist-strategy):

- **Whitepapers** (`whitepapers/`) — canonical theses (e.g. Finternet-Native Identity v1.3). Specs and architecture in this repo must align with the whitepapers relevant to its domain. Divergence must be flagged explicitly with a "Departs from whitepaper" callout or an ADR — never dressed up as derivation.
- **ADRs** (`decisions/`) — recorded strategic decisions. Treat as binding for the topic they cover.
- **Themes / epics** (`themes/`, `epics/`) — multi-repo deliveries; align this repo's roadmap with the theme(s) it serves.

Each consumer repo should list the *specific* whitepapers / ADRs that bind it (usually one or two) in its own `CLAUDE.md` Project section — see [altimist-id](https://github.com/altimist/altimist-id/blob/main/CLAUDE.md#source-of-truth--the-altimist-finternet-native-identity-whitepaper) for the pattern.

If a user request asks for something a binding whitepaper or ADR precludes, surface the conflict before writing code. These aren't permanently fixed — but operational artifacts shouldn't drift ahead of strategy without a deliberate revision step.

<!-- Altimist Baseline v7 — END -->

## Project

`altimist-com-router` is a Cloudflare Worker that **owns the `*.altimist.com` wildcard end-to-end** (no Vercel origin behind it). Its job is dispatch:

- `/.well-known/*` requests → [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API
- `<apex>/users/<handle>/did.json` (F-011 path-form DIDs) → altimist-id Resolver with `?form=path`
- `<handle>.<apex>/<path>` (any other path on a wildcard subdomain) → proxied to `VERCEL_ORIGIN/<path>` with an `x-altimist-host` header carrying the original host, so [corporate-website-v2](https://github.com/altimist/corporate-website-v2) middleware can render the subdomain's public profile
- Anything else on the apex (the marketing site) → proxied to `VERCEL_ORIGIN/<path>` with `x-altimist-host: <apex>` so corporate-website-v2 renders the marketing homepage (ADR-022; the apex `A` record points at the CF sink, so the Worker fronts it end-to-end). Staging mirrors this — the `altimist.dev` apex is fronted by the Worker too (ADR-022 ported to staging).

The Worker is the **routing layer** per [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md), refined into the **end-to-end-wildcard-owner shape** by [ADR-013](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-013-take-vercel-off-altimist-com-wildcard.md) (Option D). The Vercel cert collision that triggered ADR-013 is documented there. Topology comparison: [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md).

In production the Worker fronts the `altimist.com` apex **and** the `*.altimist.com` wildcard subdomains end-to-end — both DNS records point at the CF-only sink, and the Worker proxies non-resolver paths to the Vercel rendering backend (`VERCEL_ORIGIN`). `www.altimist.com` stays grey-cloud direct to Vercel and 307-redirects to the apex. (Earlier docs described the apex as "grey-cloud direct to Vercel"; that held until ADR-022 — the Vercel-origin-behind-CF apex couldn't auto-renew its TLS cert and went down, so the apex was moved behind the Worker too.) Staging now mirrors production: the Worker fronts the `altimist.dev` apex **and** the `*.altimist.dev` wildcard subdomains end-to-end (both DNS records point at the CF sink), proxying to the staging Vercel alias. `www.altimist.dev` sinks to the Worker, which 308-redirects it to the apex (ADR-022 ported to staging — the apex was previously a direct Vercel origin behind orange-cloud, the same latent cert trap ADR-022 closed in production).

DID-resolution logic lives in [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) v0.2+ (the `routeResolverRequest` export). The subdomain proxy branch lives in this repo's `src/index.ts` — it's outside did-publisher's concern (DID resolution) and small enough to keep inline.

### Subdomain proxy contract

The Worker proxies `<handle>.<apex>/<path>` (and, in production, apex marketing paths) to `VERCEL_ORIGIN/<path>` and sets `x-altimist-host` to the original host. Corporate-website-v2's `src/middleware.ts` reads `x-altimist-host` first, falling back to the `host` header, then rewrites the request to `/public/<handle>` (subdomain) or serves the marketing homepage (apex). To keep the Worker in pure routing territory (no response body or cookie rewriting):

- The rendering backend **must use relative URLs** for all assets (no absolute `https://altimist.com/...` URLs in HTML, CSS, or JS — otherwise the browser would navigate away from the subdomain).
- The NextAuth cookie domain must be `.altimist.com` / `.altimist.dev` (already configured in `auth-config.ts`) so sessions are shared across subdomains.

If those constraints feel binding, the right answer is to reshape the rendering layer — not to add body/cookie rewriting to the Worker.

## Stack

- **Cloudflare Workers** (Free tier; <100 LOC of dispatch logic)
- **TypeScript 5**, ESM-only
- **`@altimist/did-publisher` v0.3+** for the dispatch + proxy logic (v0.3 adds the F-011 path-form did.json route; v0.2 was subdomain-only)
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
| `ALTIMIST_ID_ORIGIN` | Base URL for altimist-id Resolver API | `https://staging.altimist.id` | `https://altimist.id` |
| `ALTIMIST_ID_APEX` | Host treated as "no handle here" | `altimist.dev` | `altimist.com` |
| `VERCEL_ORIGIN` | Cert-stable rendering backend the proxy targets | `corporate-website-v2-altimistdev-altimists-projects.vercel.app` | `corporate-website-v2-altimists-projects.vercel.app` |

CI deploy needs a `CLOUDFLARE_API_TOKEN` GitHub secret (Workers-scoped). See [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

## Routing topology

Bound via `wrangler.toml`. The wildcard DNS sinks to a CF-only target (`AAAA 100::` proxied) — no Vercel origin behind the wildcard. CF Universal SSL provisions the edge cert.

**Production:**
- `*.altimist.com/*` → Worker (catch-all; resolver paths dispatch internally to altimist-id, everything else is proxied to `VERCEL_ORIGIN` with `x-altimist-host`)
- `altimist.com/.well-known/*` → Worker (apex resolver surface, orange-cloud)
- `altimist.com/users/*` → Worker (F-011 path-form DIDs — CF route patterns forbid wildcards mid-path, so we bind the broader `/users/*` and let `routeResolverRequest` filter to the `/users/<handle>/did.json` leaf; everything else under `/users/*` falls through to the apex catch-all)
- `altimist.com/*` → Worker (apex catch-all, ADR-022; non-resolver apex paths proxy to `VERCEL_ORIGIN` with `x-altimist-host: altimist.com` for the marketing site. The apex `A` record points at the CF sink — no Vercel origin behind the apex.)
- `www.altimist.com` → grey-cloud to Vercel, 307-redirects to the apex (Worker never sees)

CF SSL/TLS encryption mode: **Full (strict)**. Changing from Flexible was required to avoid a CF↔Vercel HTTP→HTTPS redirect loop on the apex.

**Staging (dedicated `altimist.dev` apex) — mirrors production (ADR-022):**
- `*.altimist.dev/*` → Worker (catch-all; same dispatch logic as production)
- `altimist.dev/.well-known/*` → Worker (apex resolver surface)
- `altimist.dev/users/*` → Worker (F-011 path-form, same shape as production)
- `altimist.dev/*` → Worker (apex catch-all, ADR-022 ported to staging; non-resolver apex paths proxy to `VERCEL_ORIGIN` with `x-altimist-host: altimist.dev`. The apex `A` record was moved to the CF sink — no Vercel origin behind the apex, closing the same cert trap ADR-022 fixed in production.)
- `www.altimist.dev` → sinks to the Worker, which 308-redirects to the apex

The staging surface lives on `altimist.dev` rather than `staging.altimist.com` because (a) `altimist.dev` is the corporate-website-v2 staging environment anyway, and (b) a one-level wildcard is covered by free Universal SSL, whereas the previous two-level `*.staging.altimist.com` was not.

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
curl -H "Host: patrick.altimist.dev" http://localhost:8787/.well-known/did.json
```

## What this Worker does NOT do

- Generate any DID document content (altimist-id is the source of truth)
- Cache state itself (Cloudflare's edge cache handles this; the Worker just sets `Cache-Control` headers via the upstream proxy)
- Authenticate or rate-limit requests (these are altimist-id's job, or future Worker extensions)
- Rewrite response bodies or cookies — see "Subdomain proxy contract" above for the constraints this imposes on the rendering backend
