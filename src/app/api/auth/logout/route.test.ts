import { beforeEach, describe, expect, it, vi } from "vitest";

const logoutWithBackend = vi.fn();
const cookiesMock = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  logoutWithBackend: (...args: unknown[]) => logoutWithBackend(...args),
}));
vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

const { POST } = await import("./route");

function makeCookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] !== undefined ? { value: values[name] } : undefined),
  };
}

function makeRequest(origin = "https://finance.example.test"): Request {
  return new Request("https://finance.example.test/api/auth/logout", {
    method: "POST",
    headers: { origin },
  });
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a cross-origin request", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({}));
    const response = await POST(makeRequest("https://evil.example"));
    expect(response.status).toBe(403);
    expect(logoutWithBackend).not.toHaveBeenCalled();
  });

  it("calls the backend logout with the access token and clears cookies", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    logoutWithBackend.mockResolvedValueOnce({ revoked: true });

    const response = await POST(makeRequest());

    expect(logoutWithBackend).toHaveBeenCalledWith("access-1", expect.anything());
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.some((header) => header.includes("noki_finance_access_token=;"))).toBe(true);
    expect(setCookieHeaders.some((header) => header.includes("noki_finance_refresh_token=;"))).toBe(true);
  });

  it("still clears cookies and succeeds when the backend logout call fails", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    logoutWithBackend.mockRejectedValueOnce(new Error("backend unreachable"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
  });

  it("never returns a token in the response body", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({ noki_finance_access_token: "access-1" }));
    logoutWithBackend.mockResolvedValueOnce({ revoked: true });

    const response = await POST(makeRequest());
    const bodyText = await response.text();
    expect(bodyText).not.toContain("access-1");
  });

  it("skips calling the backend when there is no access token cookie", async () => {
    cookiesMock.mockResolvedValue(makeCookieStore({}));

    const response = await POST(makeRequest());

    expect(logoutWithBackend).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
