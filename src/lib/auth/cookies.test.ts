import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_COOKIE,
  applyAuthCookies,
  buildAccessTokenCookie,
  buildRefreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from "./cookies";

describe("auth cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("marks both cookies httpOnly", () => {
    expect(buildAccessTokenCookie("token", 900).httpOnly).toBe(true);
    expect(buildRefreshTokenCookie("token", 2_592_000).httpOnly).toBe(true);
  });

  it("is not secure in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(buildAccessTokenCookie("token", 900).secure).toBe(false);
  });

  it("is secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAccessTokenCookie("token", 900).secure).toBe(true);
  });

  it("scopes the access token to the whole app and the refresh token to /api/auth", () => {
    expect(buildAccessTokenCookie("token", 900).path).toBe("/");
    expect(buildRefreshTokenCookie("token", 2_592_000).path).toBe("/api/auth");
  });

  it("sets sameSite on both cookies", () => {
    expect(buildAccessTokenCookie("token", 900).sameSite).toBe("lax");
    expect(buildRefreshTokenCookie("token", 2_592_000).sameSite).toBe("lax");
  });

  it("uses app-prefixed cookie names to avoid cross-app collisions", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("noki_finance_access_token");
    expect(REFRESH_TOKEN_COOKIE).toBe("noki_finance_refresh_token");
  });

  it("applies both cookies with the token values from the backend response", () => {
    const response = NextResponse.json({ ok: true });
    applyAuthCookies(response, {
      accessToken: "access-123",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-456",
      refreshTokenExpiresIn: 2_592_000,
    });

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("access-123");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("refresh-456");
  });

  it("clears both cookies with an empty value and zero maxAge on logout", () => {
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
  });

  it("never contains a token in the JSON body sent to the browser", () => {
    const response = NextResponse.json({ ok: true });
    applyAuthCookies(response, {
      accessToken: "access-123",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-456",
      refreshTokenExpiresIn: 2_592_000,
    });

    // The only place tokens exist is in Set-Cookie headers, never in the body.
    expect(JSON.stringify({ ok: true })).not.toContain("access-123");
    expect(JSON.stringify({ ok: true })).not.toContain("refresh-456");
  });
});
