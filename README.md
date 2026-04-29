# altimist-com-router

Cloudflare Worker that **owns the `*.altimist.com` wildcard end-to-end** and routes its traffic. Dispatches `/.well-known/*` requests to [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API. Phase 2b will add a subdomain-to-path translation that forwards `<handle>.altimist.com/<path>` to a single Vercel-attached rendering backend.

Implements **Option D** per [ADR-013](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-013-take-vercel-off-altimist-com-wildcard.md), which refines [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md)'s Option W. Topology comparison: [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md).

## What it does

| Path on `altimist.com` / `staging.altimist.com` | Routes to |
|---|---|
| `<handle>.altimist.com/.well-known/did.json` | `altimist-id`'s `/api/resolver/did/<handle>` |
| `altimist.com/.well-known/revocations.json` | `altimist-id`'s `/api/resolver/revocations` |
| `altimist.com/.well-known/team-issuers/<team>.json` | `altimist-id`'s `/api/resolver/team-issuers/<team>` |
| Anything else under `/.well-known/*` | 404 |
| `<handle>.altimist.com/<path>` (Phase 2b — not yet) | translates to `<vercel-host>/u/<handle>/<path>` and forwards |
| Anything else on `*.altimist.com` (today) | 404 |

Note: `altimist.com` apex and `www.altimist.com` are **not** owned by this Worker — they're grey-cloud direct to Vercel for the marketing site. Worker routes only fire on the wildcard subdomains.

The Worker is the **routing layer** — it carries no identity state, renders no presentation content. ~20 LOC of glue. The proxy + dispatch logic lives in [`@altimist/did-publisher`](https://www.npmjs.com/package/@altimist/did-publisher).

## Setup

```bash
npm install
npm run dev          # localhost:8787 (wrangler dev)
npm test             # vitest
npm run typecheck    # tsc --noEmit
```

Local request:

```bash
curl -H "Host: patrick.staging.altimist.com" http://localhost:8787/.well-known/did.json
```

## Configuration

Environment variables live per-environment in [`wrangler.toml`](./wrangler.toml):

| Variable | Staging | Production |
|---|---|---|
| `ALTIMIST_ID_ORIGIN` | `https://staging.id.altimist.ai` | `https://id.altimist.ai` |
| `ALTIMIST_ID_APEX` | `staging.altimist.com` | `altimist.com` |

## Deployment

```bash
npm run deploy:staging        # wrangler deploy --env staging
npm run deploy:production     # wrangler deploy --env production
```

CI deploys on push to `staging` or `main` via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Requires a `CLOUDFLARE_API_TOKEN` GitHub secret (Workers-scoped).

## Cloudflare route bindings

Bound via `wrangler.toml`. The wildcard DNS (`*.altimist.com` and `*.staging.altimist.com`) sinks to `AAAA 100::` proxied — no Vercel origin behind the wildcard; the Worker is the canonical owner of all traffic on those hostnames. CF Universal SSL provisions the edge cert (Vercel's `_acme-challenge.altimist.com` NS delegation was removed per ADR-013 to unblock DCV).

**Production (deployed 2026-04-29):**
- `*.altimist.com/.well-known/*` → Worker ✓ bound
- `altimist.com/.well-known/*` → Worker — **deferred** (apex grey-cloud unchanged for now to protect the marketing site; flip + bind separately)

**Staging (deployed 2026-04-29):**
- `*.staging.altimist.com/.well-known/*` → Worker ✓ bound
- `staging.altimist.com/.well-known/*` → Worker ✓ bound

## Related

- [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) — proxy + dispatch logic this Worker imports
- [`altimist-id`](https://github.com/altimist/altimist-id) — identity service this Worker proxies to
- [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md) — decision rationale
- [F-010](https://github.com/altimist/altimist-id/blob/main/docs/specs/F-010-finternet-native-identity-phase-2a.md) — Phase 2a spec

## License

UNLICENSED — internal Altimist.
