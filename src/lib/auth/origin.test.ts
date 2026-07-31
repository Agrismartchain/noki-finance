import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "./origin";

function makeRequest(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("accepts a matching Origin header", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      origin: "https://finance.example.test",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("falls back to Referer when Origin is absent", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      referer: "https://finance.example.test/fr/login",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a cross-site Origin", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      origin: "https://evil.example",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects a request with neither Origin nor Referer", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {});
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("accepts browser same-origin fetch metadata when Origin and Referer are absent", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      "sec-fetch-site": "same-origin",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts browser same-site fetch metadata when local hosts are normalized differently", () => {
    const request = makeRequest("http://localhost:3004/api/auth/login", {
      origin: "http://127.0.0.1:3004",
      "sec-fetch-site": "same-site",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts browser same-origin fetch metadata when local server binds to 0.0.0.0", () => {
    const request = makeRequest("http://0.0.0.0:3004/api/auth/login", {
      origin: "http://localhost:3004",
      "sec-fetch-site": "same-origin",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects browser same-site fetch metadata for non-local mismatched origins", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      origin: "https://preview.example.test",
      "sec-fetch-site": "same-site",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects browser cross-site fetch metadata when Origin and Referer are absent", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      "sec-fetch-site": "cross-site",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    const request = makeRequest("https://finance.example.test/api/auth/login", {
      origin: "not-a-url",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("accepts a proxied request when Origin matches the forwarded host/proto", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-host": "finance-staging.noki-services.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts a proxied request when Referer matches the forwarded host/proto", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      referer: "https://finance-staging.noki-services.com/fr/login",
      "x-forwarded-host": "finance-staging.noki-services.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a hostile Origin that differs from the forwarded host", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://evil.example",
      "x-forwarded-host": "finance-staging.noki-services.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects when the forwarded host matches but the forwarded proto differs from Origin", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-host": "finance-staging.noki-services.com",
      "x-forwarded-proto": "http",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("fails safe when only x-forwarded-host is present", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-host": "finance-staging.noki-services.com",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("fails safe when only x-forwarded-proto is present", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("fails safe when the forwarded proto is not http or https", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-host": "finance-staging.noki-services.com",
      "x-forwarded-proto": "ftp",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("uses only the first value of comma-separated forwarded headers", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://finance-staging.noki-services.com",
      "x-forwarded-host": "finance-staging.noki-services.com, evil.example",
      "x-forwarded-proto": "https, http",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });
});
