import { describe, it, expect, vi, beforeEach } from "vitest";
import worker, { type Env } from "./index";

const env: Env = {
  ALTIMIST_ID_ORIGIN: "https://id.altimist.ai",
  ALTIMIST_ID_APEX: "altimist.com",
};

describe("altimist-com-router fetch handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 for apex non-resolver paths (Worker has no apex catch-all)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const req = new Request("https://altimist.com/marketing/page", {
      headers: { host: "altimist.com" },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dispatches did.json on a handle subdomain to altimist-id Resolver", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "did:web:patrick.altimist.com" }), {
        status: 200,
      }),
    );
    const req = new Request(
      "https://patrick.altimist.com/.well-known/did.json",
      { headers: { host: "patrick.altimist.com" } },
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://id.altimist.ai/api/resolver/did/patrick",
      expect.any(Object),
    );
  });

  it("dispatches revocations.json on the apex to altimist-id Resolver", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    const req = new Request(
      "https://altimist.com/.well-known/revocations.json",
      { headers: { host: "altimist.com" } },
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://id.altimist.ai/api/resolver/revocations",
      expect.any(Object),
    );
  });

  it("dispatches team-issuers/<team>.json on the apex to altimist-id Resolver", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const req = new Request(
      "https://altimist.com/.well-known/team-issuers/altimist.json",
      { headers: { host: "altimist.com" } },
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://id.altimist.ai/api/resolver/team-issuers/altimist",
      expect.any(Object),
    );
  });

  it("respects the configured apex (staging on altimist.dev)", async () => {
    const stagingEnv: Env = {
      ALTIMIST_ID_ORIGIN: "https://staging.id.altimist.ai",
      ALTIMIST_ID_APEX: "altimist.dev",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const req = new Request(
      "https://patrick.altimist.dev/.well-known/did.json",
      { headers: { host: "patrick.altimist.dev" } },
    );
    const res = await worker.fetch(req, stagingEnv);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://staging.id.altimist.ai/api/resolver/did/patrick",
      expect.any(Object),
    );
  });

  it("dispatches path-form did.json on the apex to altimist-id Resolver with ?form=path (F-011)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "did:web:altimist.com:users:alice" }),
        { status: 200 },
      ),
    );
    const req = new Request("https://altimist.com/users/alice/did.json", {
      headers: { host: "altimist.com" },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://id.altimist.ai/api/resolver/did/alice?form=path",
      expect.any(Object),
    );
  });

  it("proxies subdomain non-resolver paths to the apex with x-altimist-host", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const req = new Request("https://patrick.altimist.com/profile/portfolio", {
      headers: { host: "patrick.altimist.com" },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [proxied, init] = fetchSpy.mock.calls[0];
    expect((proxied as Request).url).toBe(
      "https://altimist.com/profile/portfolio",
    );
    expect((proxied as Request).headers.get("x-altimist-host")).toBe(
      "patrick.altimist.com",
    );
    expect((init as RequestInit | undefined)?.redirect).toBe("manual");
  });

  it("preserves the query string when proxying subdomain requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const req = new Request(
      "https://patrick.altimist.com/api/foo?bar=baz&qux=1",
      { headers: { host: "patrick.altimist.com" } },
    );
    await worker.fetch(req, env);
    expect((fetchSpy.mock.calls[0][0] as Request).url).toBe(
      "https://altimist.com/api/foo?bar=baz&qux=1",
    );
  });

  it("proxies subdomain non-resolver paths on staging to altimist.dev", async () => {
    const stagingEnv: Env = {
      ALTIMIST_ID_ORIGIN: "https://staging.id.altimist.ai",
      ALTIMIST_ID_APEX: "altimist.dev",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const req = new Request("https://patrick.altimist.dev/profile", {
      headers: { host: "patrick.altimist.dev" },
    });
    await worker.fetch(req, stagingEnv);
    expect((fetchSpy.mock.calls[0][0] as Request).url).toBe(
      "https://altimist.dev/profile",
    );
    expect(
      (fetchSpy.mock.calls[0][0] as Request).headers.get("x-altimist-host"),
    ).toBe("patrick.altimist.dev");
  });
});
