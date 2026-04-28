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

  it("returns 404 for non-resolver-surface paths (passes through to caller)", async () => {
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

  it("respects the configured apex (staging)", async () => {
    const stagingEnv: Env = {
      ALTIMIST_ID_ORIGIN: "https://staging.id.altimist.ai",
      ALTIMIST_ID_APEX: "staging.altimist.com",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const req = new Request(
      "https://patrick.staging.altimist.com/.well-known/did.json",
      { headers: { host: "patrick.staging.altimist.com" } },
    );
    const res = await worker.fetch(req, stagingEnv);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://staging.id.altimist.ai/api/resolver/did/patrick",
      expect.any(Object),
    );
  });
});
