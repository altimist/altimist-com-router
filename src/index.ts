import { routeResolverRequest } from "@altimist/did-publisher";

export interface Env {
  ALTIMIST_ID_ORIGIN: string;
  ALTIMIST_ID_APEX: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routeResolverRequest(request, {
      origin: env.ALTIMIST_ID_ORIGIN,
      apex: env.ALTIMIST_ID_APEX,
    });
    if (response) return response;
    return new Response("Not Found", { status: 404 });
  },
};
