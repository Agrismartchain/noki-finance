import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiConfigError } from "@/lib/api/config";
import { NokiApiError } from "@/lib/api/errors";

const loginWithBackend = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  loginWithBackend: (...args: unknown[]) => loginWithBackend(...args),
}));

const { POST } = await import("./route");

function makeRequest(body: unknown, overrides: Partial<{ origin: string; contentType: string }> = {}): Request {
  const url = "https://finance.example.test/api/auth/login";
  return new Request(url, {
    method: "POST",
    headers: {
      origin: overrides.origin ?? "https://finance.example.test",
      "content-type": overrides.contentType ?? "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a cross-origin request before touching the backend", async () => {
    const request = makeRequest({ email: "a@b.test", password: "secret" }, { origin: "https://evil.example" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(loginWithBackend).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON content type", async () => {
    const request = makeRequest("email=a@b.test", { contentType: "text/plain" });
    const response = await POST(request);

    expect(response.status).toBe(415);
    expect(loginWithBackend).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const request = makeRequest({ email: "not-an-email" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(loginWithBackend).not.toHaveBeenCalled();
  });

  it("rejects an oversized body", async () => {
    const request = makeRequest({ email: "a@b.test", password: "a".repeat(5000) });
    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(loginWithBackend).not.toHaveBeenCalled();
  });

  it("sets httpOnly cookies and never returns a token in the JSON body on success", async () => {
    loginWithBackend.mockResolvedValueOnce({
      tokenType: "Bearer",
      accessToken: "access-1",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-1",
      refreshTokenExpiresIn: 2_592_000,
    });

    const request = makeRequest({ email: "finance-user@example.test", password: "correct-password" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const bodyText = await response.text();
    expect(bodyText).not.toContain("access-1");
    expect(bodyText).not.toContain("refresh-1");

    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.some((header) => header.includes("access-1"))).toBe(true);
    expect(setCookieHeaders.some((header) => header.includes("refresh-1"))).toBe(true);
    expect(setCookieHeaders.every((header) => /HttpOnly/i.test(header))).toBe(true);
  });

  it("maps invalid credentials to a generic 401 without the backend's raw message", async () => {
    loginWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Invalid credentials"));

    const request = makeRequest({ email: "finance-user@example.test", password: "wrong-password" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("INVALID_CREDENTIALS");
  });

  it("maps a network failure to a 503", async () => {
    loginWithBackend.mockRejectedValueOnce(new NokiApiError("network", "Unable to reach the NOKI API."));

    const request = makeRequest({ email: "finance-user@example.test", password: "correct-password" });
    const response = await POST(request);

    expect(response.status).toBe(503);
  });

  it("maps a timeout to a 504", async () => {
    loginWithBackend.mockRejectedValueOnce(new NokiApiError("timeout", "timed out"));

    const request = makeRequest({ email: "finance-user@example.test", password: "correct-password" });
    const response = await POST(request);

    expect(response.status).toBe(504);
  });

  it("maps a missing NOKI_API_BASE_URL to a distinct configuration-error code", async () => {
    loginWithBackend.mockRejectedValueOnce(new NokiApiConfigError("NOKI_API_BASE_URL is not configured."));

    const request = makeRequest({ email: "finance-user@example.test", password: "correct-password" });
    const response = await POST(request);

    expect(response.status).toBe(503);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("CONFIGURATION_ERROR");
  });
});
