import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveSession = vi.fn();
const cookiesMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  resolveSession: (...args: unknown[]) => resolveSession(...args),
}));
vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

const { GET } = await import("./route");

function makeCookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] !== undefined ? { value: values[name] } : undefined),
  };
}

function makeRequest(): Request {
  return new Request("https://finance.example.test/api/auth/session", { method: "GET" });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with only the sanitized actor fields when authenticated", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    resolveSession.mockResolvedValueOnce({
      status: "authenticated",
      actor: { actorId: "a-1", displayName: "Finance Actor", email: null, memberships: [] },
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; actor: { actorId: string } };
    expect(body.status).toBe("authenticated");
    expect(body.actor.actorId).toBe("a-1");
  });

  it("returns 401 and clears cookies when unauthenticated", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({}));
    resolveSession.mockResolvedValueOnce({ status: "unauthenticated" });

    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().some((header) => header.includes("noki_finance_access_token=;"))).toBe(true);
  });

  it("returns 403 without clearing cookies when forbidden", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    resolveSession.mockResolvedValueOnce({ status: "forbidden" });

    const response = await GET(makeRequest());
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it("persists rotated cookies returned by a successful refresh", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "expired", noki_finance_refresh_token: "old-refresh" }));
    resolveSession.mockResolvedValueOnce({
      status: "authenticated",
      actor: { actorId: "a-1", displayName: "Finance Actor", email: null, memberships: [] },
      rotatedTokens: {
        accessToken: "new-access",
        accessTokenExpiresIn: 900,
        refreshToken: "new-refresh",
        refreshTokenExpiresIn: 2_592_000,
      },
    });

    const response = await GET(makeRequest());
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.some((header) => header.includes("new-access"))).toBe(true);
    expect(setCookieHeaders.some((header) => header.includes("new-refresh"))).toBe(true);
  });

  it("passes allowRefresh: true to resolveSession -- this is the only place refresh is attempted", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    resolveSession.mockResolvedValueOnce({ status: "unauthenticated" });

    await GET(makeRequest());

    expect(resolveSession).toHaveBeenCalledWith(expect.objectContaining({ allowRefresh: true }));
  });
});
