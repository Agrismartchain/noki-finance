import type { NextResponse } from "next/server";

/**
 * noki-api issues bearer tokens over JSON only -- it has no cookie support of
 * its own. These are the two httpOnly cookies noki-finance (the BFF) uses to
 * hold them server-side; the browser never sees a token value. Cookie names
 * are app-prefixed (unlike noki-contact-center's bare "noki_access_token")
 * to avoid any cross-app cookie collision if apps ever share a parent domain.
 */
export const ACCESS_TOKEN_COOKIE = "noki_finance_access_token";
export const REFRESH_TOKEN_COOKIE = "noki_finance_refresh_token";

export interface AuthTokenPair {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * The refresh token is single-use and rotates on every call, so it is scoped
 * to /api/auth: only the BFF's own auth routes ever need to read it. The
 * access token is read on every page render (Server Components under
 * src/app/[locale]/**), so it must be sent on every path.
 */
export function buildAccessTokenCookie(value: string, maxAgeSeconds: number) {
  return {
    name: ACCESS_TOKEN_COOKIE,
    value,
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function buildRefreshTokenCookie(value: string, maxAgeSeconds: number) {
  return {
    name: REFRESH_TOKEN_COOKIE,
    value,
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: maxAgeSeconds,
  };
}

export function applyAuthCookies(response: NextResponse, tokens: AuthTokenPair): void {
  response.cookies.set(buildAccessTokenCookie(tokens.accessToken, tokens.accessTokenExpiresIn));
  response.cookies.set(buildRefreshTokenCookie(tokens.refreshToken, tokens.refreshTokenExpiresIn));
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(buildAccessTokenCookie("", 0));
  response.cookies.set(buildRefreshTokenCookie("", 0));
}
