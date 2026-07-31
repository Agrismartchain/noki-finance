/**
 * Same-origin check for the BFF's own mutation routes (login, logout). This
 * is not a general CSRF library: it compares the Origin (falling back to
 * Referer) header against the request's own URL, which is enough for a
 * same-origin BFF that never needs to accept cross-site form posts.
 *
 * Behind Traefik, request.url carries the container-internal origin rather
 * than the public one, so the "own URL" side of the comparison is resolved
 * from x-forwarded-proto/x-forwarded-host (set by Traefik, never by the
 * browser) instead. Those headers are never used to satisfy the comparison
 * on the Origin/Referer side -- only to know what our own origin is.
 */
export function isSameOriginRequest(request: Request): boolean {
  const forwarded = resolveForwardedOrigin(request);
  if (forwarded === "invalid") {
    return false;
  }

  const requestUrl = new URL(request.url);
  const effectiveUrl = forwarded === "absent" ? requestUrl : forwarded.url;
  const effectiveOrigin = effectiveUrl.origin;

  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (!candidate) {
    return secFetchSite === "same-origin" || isSameSiteLocalRequest(effectiveUrl, secFetchSite);
  }

  let candidateUrl: URL;
  try {
    candidateUrl = new URL(candidate);
  } catch {
    return false;
  }

  return candidateUrl.origin === effectiveOrigin || isSameSiteLocalPair(effectiveUrl, candidateUrl, secFetchSite);
}

/**
 * Resolves the reverse-proxy-forwarded origin, if any. Returns "absent" when
 * neither forwarded header is set (plain local/direct request), "invalid"
 * when only one is set or either value doesn't parse to a safe http(s)
 * origin (a misconfigured or spoofed proxy hop -- fail closed rather than
 * silently falling back), or the resolved URL otherwise.
 */
function resolveForwardedOrigin(request: Request): { url: URL } | "invalid" | "absent" {
  const rawProto = request.headers.get("x-forwarded-proto");
  const rawHost = request.headers.get("x-forwarded-host");

  if (rawProto === null && rawHost === null) {
    return "absent";
  }

  if (rawProto === null || rawHost === null) {
    return "invalid";
  }

  const proto = firstValue(rawProto);
  const host = firstValue(rawHost);

  if (proto !== "http" && proto !== "https") {
    return "invalid";
  }

  if (!host) {
    return "invalid";
  }

  try {
    return { url: new URL(`${proto}://${host}`) };
  } catch {
    return "invalid";
  }
}

function firstValue(headerValue: string): string {
  return headerValue.split(",")[0]?.trim() ?? "";
}

function isSameSiteLocalRequest(requestUrl: URL, secFetchSite: string | undefined): boolean {
  return secFetchSite === "same-site" && isLoopbackHost(requestUrl.hostname);
}

function isSameSiteLocalPair(requestUrl: URL, candidateUrl: URL, secFetchSite: string | undefined): boolean {
  if (secFetchSite !== "same-origin" && !isSameSiteLocalRequest(requestUrl, secFetchSite)) {
    return false;
  }

  if (!isLoopbackHost(requestUrl.hostname) || !isLoopbackHost(candidateUrl.hostname)) {
    return false;
  }

  return candidateUrl.protocol === requestUrl.protocol && candidateUrl.port === requestUrl.port;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0";
}
