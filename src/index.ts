import { routeResolverRequest } from "@altimist/did-publisher";

export interface Env {
  ALTIMIST_ID_ORIGIN: string;
  ALTIMIST_ID_APEX: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const resolverResponse = await routeResolverRequest(request, {
      origin: env.ALTIMIST_ID_ORIGIN,
      apex: env.ALTIMIST_ID_APEX,
    });
    if (resolverResponse) return resolverResponse;

    // Subdomain proxy: <handle>.<apex>/<path> → <apex>/<path>
    // The custom x-altimist-host header lets corporate-website-v2 middleware
    // recover the original subdomain so it rewrites to /public/<handle>.
    const url = new URL(request.url);
    const host = url.hostname;
    const apex = env.ALTIMIST_ID_APEX;
    if (host !== apex && host.endsWith(`.${apex}`)) {
      const upstream = new URL(
        url.pathname + url.search,
        `https://${apex}`,
      );
      const proxied = new Request(upstream.toString(), request);
      proxied.headers.set("x-altimist-host", host);
      return fetch(proxied, { redirect: "manual" });
    }

    return new Response("Not Found", { status: 404 });
  },
};
