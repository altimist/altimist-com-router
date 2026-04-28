# altimist-com-router

Cloudflare Worker that routes the `altimist.com` zone — dispatches `/.well-known/*` requests to [altimist-id](https://github.com/altimist/altimist-id)'s Resolver API, and stays out of the way for everything else (which CF route patterns leave bound to corporate-website-v2 unchanged).

Implements **Option W** per [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md). Topology comparison: [`altimist-id/docs/architecture/future-architecture.md`](https://github.com/altimist/altimist-id/blob/main/docs/architecture/future-architecture.md).

## What it does

| Path on `altimist.com` (or `staging.altimist.com`) | Routes to |
|---|---|
| `<handle>.altimist.com/.well-known/did.json` | `altimist-id`'s `/api/resolver/did/<handle>` |
| `altimist.com/.well-known/revocations.json` | `altimist-id`'s `/api/resolver/revocations` |
| `altimist.com/.well-known/team-issuers/<team>.json` | `altimist-id`'s `/api/resolver/team-issuers/<team>` |
| Anything else under `/.well-known/*` | 404 |
| Anything not matching `/.well-known/*` | Worker doesn't see it (CF route pattern bypasses) |

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

Routes are commented out in `wrangler.toml` and managed via the CF dashboard / `flarectl` during the staging-W testbed phase. Once the testbed cooks per ADR-012's graduation criteria, route patterns get enabled in `wrangler.toml` and managed via Wrangler going forward.

**Production target:**
- `*.altimist.com/.well-known/*` → Worker
- `altimist.com/.well-known/*` → Worker

**Staging target:**
- `*.staging.altimist.com/.well-known/*` → Worker
- `staging.altimist.com/.well-known/*` → Worker

## Related

- [`@altimist/did-publisher`](https://github.com/altimist/did-publisher) — proxy + dispatch logic this Worker imports
- [`altimist-id`](https://github.com/altimist/altimist-id) — identity service this Worker proxies to
- [ADR-012](https://github.com/altimist/altimist-strategy/blob/main/decisions/ADR-012-adopt-separate-routing-layer-for-resolver-surface.md) — decision rationale
- [F-010](https://github.com/altimist/altimist-id/blob/main/docs/specs/F-010-finternet-native-identity-phase-2a.md) — Phase 2a spec

## License

UNLICENSED — internal Altimist.
