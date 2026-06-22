import { routeResolverRequest } from "@altimist/did-publisher";

export interface Env {
  ALTIMIST_ID_ORIGIN: string;
  ALTIMIST_ID_APEX: string;
  VERCEL_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // www.<apex> is a canonical-redirect host, not a profile handle: 308 it to
    // the bare apex, preserving path + query. In production www.altimist.com is
    // grey-cloud direct to Vercel and never reaches the Worker; on staging
    // www.altimist.dev sinks to the Worker (ADR-022 ported to staging), so the
    // redirect has to happen here — otherwise the subdomain proxy below would
    // treat "www" as a handle and render /public/www.
    if (url.hostname === `www.${env.ALTIMIST_ID_APEX}`) {
      return Response.redirect(
        `https://${env.ALTIMIST_ID_APEX}${url.pathname}${url.search}`,
        308,
      );
    }

    const resolverResponse = await routeResolverRequest(request, {
      origin: env.ALTIMIST_ID_ORIGIN,
      apex: env.ALTIMIST_ID_APEX,
    });
    if (resolverResponse) return resolverResponse;

    // Rendering proxy: forward every non-resolver request on the apex or a
    // wildcard subdomain to the Vercel rendering backend. The x-altimist-host
    // header carries the original host so corporate-website-v2 middleware
    // renders the right surface — the apex (host === apex) → marketing
    // homepage; a <handle>.<apex> subdomain → /public/<handle>.
    //
    // We target VERCEL_ORIGIN — a cert-stable Vercel hostname — rather than the
    // apex. In production the apex is fronted by this Worker end-to-end (its A
    // record points at the CF-only sink), so proxying back to the apex would
    // loop; VERCEL_ORIGIN bypasses the Worker. See ADR-022.
    const host = url.hostname;
    const apex = env.ALTIMIST_ID_APEX;
    if (host === apex || host.endsWith(`.${apex}`)) {
      const upstream = new URL(
        url.pathname + url.search,
        `https://${env.VERCEL_ORIGIN}`,
      );
      const proxied = new Request(upstream.toString(), request);
      proxied.headers.set("x-altimist-host", host);
      return fetch(proxied, { redirect: "manual" });
    }

    return new Response("Not Found", { status: 404 });
  },
};
