# altimist-com-router

Cloudflare Worker that **owns the wildcards end-to-end** — `*.altimist.com` (production) and `*.altimist.dev` (staging). Two jobs:

1. Dispatches `/.well-known/*` and apex `/users/*/did.json` requests to [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API.
2. Proxies every other request on a wildcard subdomain (`<handle>.altimist.com/<path>`) to the apex, setting `x-altimist-host` so [corporate-website-v2](https://github.com/altimist/corporate-website-v2) middleware can render the subdomain's public profile.

Implements **Option D** per [ADR-013](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-013-take-vercel-off-altimist-com-wildcard.md), which refines [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md)'s Option W. Topology comparison: [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md).

## What it does

For `<apex>` ∈ {`altimist.com`, `altimist.dev`}:

| Request | Routes to |
|---|---|
| `<handle>.<apex>/.well-known/did.json` | `altimist-id` `/api/resolver/did/<handle>` |
| `<apex>/.well-known/revocations.json` | `altimist-id` `/api/resolver/revocations` |
| `<apex>/.well-known/team-issuers/<team>.json` | `altimist-id` `/api/resolver/team-issuers/<team>` |
| `<handle>.<apex>/<path>` (any other path) | `<apex>/<path>` with `x-altimist-host: <handle>.<apex>` |
| Anything else on `<apex>` | 404 (Worker doesn't see non-`.well-known` apex traffic) |

Note: `altimist.com` apex and `www.altimist.com` are **not** owned by this Worker — they're grey-cloud direct to Vercel for the marketing site. Worker routes only fire on the wildcard subdomains and the apex resolver surface.

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

## Deployment

```bash
npm run deploy:staging        # wrangler deploy --env staging
npm run deploy:production     # wrangler deploy --env production
```

CI deploys on push to `staging` or `main` via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Requires a `CLOUDFLARE_API_TOKEN` GitHub secret (Workers-scoped).

## Cloudflare route bindings

Bound via `wrangler.toml`. Wildcard DNS sinks to `AAAA 100::` proxied — no Vercel origin behind the wildcards; the Worker is the canonical owner of all traffic on those hostnames. CF Universal SSL provisions the edge certs.

**Production (`altimist.com`):**
- `*.altimist.com/*` → Worker (catch-all; resolver paths dispatch internally, other paths are proxied to `altimist.com` with `x-altimist-host`)
- `altimist.com/.well-known/*` → Worker (apex resolver surface; orange-cloud, CF SSL mode "Full (strict)")
- `altimist.com/users/*` → Worker (F-011 path-form did.json; the broader `/users/*` is required because CF route patterns forbid wildcards mid-path — `routeResolverRequest` filters to the `did.json` leaf)

**Staging (`altimist.dev`):**
- `*.altimist.dev/*` → Worker (catch-all; same dispatch as production)
- `altimist.dev/.well-known/*` → Worker
- `altimist.dev/users/*` → Worker (F-011 path-form, same shape as production)

The staging surface lives on `altimist.dev` rather than `staging.altimist.com` because `altimist.dev` is the corporate-website-v2 staging environment anyway, and a one-level wildcard is covered by free Universal SSL (the previous two-level `*.staging.altimist.com` was not).

## Related

- [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) — proxy + dispatch logic this Worker imports
- [`altimist-id`](https://github.com/altimist/altimist-id) — identity service this Worker proxies to
- [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md) — decision rationale
- [F-010](https://github.com/altimist/altimist-id/blob/main/docs/specs/F-010-finternet-native-identity-phase-2a.md) — Phase 2a spec

## License

UNLICENSED — internal Altimist.
