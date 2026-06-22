# altimist-com-router

Cloudflare Worker that **fronts the `altimist.com` zone end-to-end** — the apex, `*.altimist.com` (production), and `*.altimist.dev` (staging). Two jobs:

1. Dispatches `/.well-known/*` and apex `/users/*/did.json` requests to [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API.
2. Proxies every other request — the apex marketing site and any wildcard-subdomain path (`<handle>.altimist.com/<path>`) — to the [corporate-website-v2](https://github.com/altimist/corporate-website-v2) rendering backend (`VERCEL_ORIGIN`), setting `x-altimist-host` so its middleware renders the marketing homepage (apex) or the subdomain's public profile.

Implements **Option D** per [ADR-013](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-013-take-vercel-off-altimist-com-wildcard.md), which refines [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md)'s Option W. Topology comparison: [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md).

## What it does

For `<apex>` ∈ {`altimist.com`, `altimist.dev`}:

| Request | Routes to |
|---|---|
| `<handle>.<apex>/.well-known/did.json` | `altimist-id` `/api/resolver/did/<handle>` |
| `<apex>/.well-known/revocations.json` | `altimist-id` `/api/resolver/revocations` |
| `<apex>/.well-known/team-issuers/<team>.json` | `altimist-id` `/api/resolver/team-issuers/<team>` |
| `<handle>.<apex>/<path>` (any other path) | `VERCEL_ORIGIN/<path>` with `x-altimist-host: <handle>.<apex>` (renders `/public/<handle>`) |
| Anything else on `<apex>` (apex marketing) | `VERCEL_ORIGIN/<path>` with `x-altimist-host: <apex>` (renders the marketing site) |
| `www.<apex>/<path>` | 308 redirect to `https://<apex>/<path>` |

Note: the Worker fronts **both apexes** end-to-end — each apex `A`/`AAAA` record points at the CF-only sink (`AAAA 100::`), and non-resolver apex paths (the marketing site) are proxied to the Vercel rendering backend (`VERCEL_ORIGIN`), not served by a Vercel origin on the apex. This extends Option D to the apex (ADR-022): the previous Vercel-origin-behind-CF apex couldn't auto-renew its TLS cert and went down, taking the apex and every subdomain profile page with it. Both `www.altimist.com` and `www.altimist.dev` sink to the Worker (`AAAA 100::`), which 308-redirects them to their apex. Staging was brought onto this model after production — the `altimist.dev` apex was a direct Vercel origin behind orange-cloud (the same latent cert trap) until ADR-022 was ported to it.

The Worker is the **routing layer** — it carries no identity state, renders no presentation content. DID-resolution logic lives in [`@altimist/did-publisher`](https://www.npmjs.com/package/@altimist/did-publisher); the subdomain proxy branch is inline in `src/index.ts`.

## Setup

```bash
npm install
npm run dev          # localhost:8787 (wrangler dev)
npm test             # vitest
npm run typecheck    # tsc --noEmit
```

Local request:

```bash
curl -H "Host: patrick.altimist.dev" http://localhost:8787/.well-known/did.json
```

## Configuration

Environment variables live per-environment in [`wrangler.toml`](./wrangler.toml):

| Variable | Staging | Production |
|---|---|---|
| `ALTIMIST_ID_ORIGIN` | `https://staging.altimist.id` | `https://altimist.id` |
| `ALTIMIST_ID_APEX` | `altimist.dev` | `altimist.com` |
| `VERCEL_ORIGIN` | `corporate-website-v2-altimistdev-altimists-projects.vercel.app` | `corporate-website-v2-altimists-projects.vercel.app` |

## Deployment

```bash
npm run deploy:staging        # wrangler deploy --env staging
npm run deploy:production     # wrangler deploy --env production
```

CI deploys on push to `staging` or `main` via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Requires a `CLOUDFLARE_API_TOKEN` GitHub secret (Workers-scoped).

## Cloudflare route bindings

Bound via `wrangler.toml`. Wildcard DNS sinks to `AAAA 100::` proxied — no Vercel origin behind the wildcards; the Worker is the canonical owner of all traffic on those hostnames. CF Universal SSL provisions the edge certs.

**Production (`altimist.com`):**
- `*.altimist.com/*` → Worker (catch-all; resolver paths dispatch internally, other paths are proxied to `VERCEL_ORIGIN` with `x-altimist-host`)
- `altimist.com/.well-known/*` → Worker (apex resolver surface; orange-cloud, CF SSL mode "Full (strict)")
- `altimist.com/users/*` → Worker (F-011 path-form did.json; the broader `/users/*` is required because CF route patterns forbid wildcards mid-path — `routeResolverRequest` filters to the `did.json` leaf)
- `altimist.com/*` → Worker (apex catch-all, ADR-022; non-resolver apex paths proxy to `VERCEL_ORIGIN` with `x-altimist-host: altimist.com` for the marketing site. The apex `A` record points at the CF sink, so the Worker fronts the apex end-to-end. Subsumes the two routes above, kept as explicit bindings.)

**Staging (`altimist.dev`) — mirrors production (ADR-022):**
- `*.altimist.dev/*` → Worker (catch-all; same dispatch as production)
- `altimist.dev/.well-known/*` → Worker
- `altimist.dev/users/*` → Worker (F-011 path-form, same shape as production)
- `altimist.dev/*` → Worker (apex catch-all, ADR-022 ported to staging; non-resolver apex paths proxy to `VERCEL_ORIGIN` with `x-altimist-host: altimist.dev`. The apex `A` record was moved to the CF sink, so the Worker fronts the apex end-to-end. Subsumes the routes above, kept as explicit bindings.)
- `www.altimist.dev` → sinks to the Worker, which 308-redirects to the apex

The staging surface lives on `altimist.dev` rather than `staging.altimist.com` because `altimist.dev` is the corporate-website-v2 staging environment anyway, and a one-level wildcard is covered by free Universal SSL (the previous two-level `*.staging.altimist.com` was not).

## Related

- [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) — proxy + dispatch logic this Worker imports
- [`altimist-id`](https://github.com/altimist/altimist-id) — identity service this Worker proxies to
- [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md) — decision rationale
- [F-010](https://github.com/altimist/altimist-id/blob/main/docs/specs/F-010-finternet-native-identity-phase-2a.md) — Phase 2a spec

## License

UNLICENSED — internal Altimist.
