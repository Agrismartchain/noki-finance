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
});
