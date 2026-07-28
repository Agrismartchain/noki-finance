import { describe, expect, it } from "vitest";

import { MAX_LOGIN_BODY_BYTES, parseLoginBody, readBoundedBody } from "./request-body";

function makeRequest(body: string, contentLength?: string): Request {
  const headers: Record<string, string> = {};
  if (contentLength !== undefined) {
    headers["content-length"] = contentLength;
  }
  return new Request("https://finance.example.test/api/auth/login", { method: "POST", body, headers });
}

describe("readBoundedBody", () => {
  it("returns the body text when within the limit", async () => {
    const request = makeRequest('{"email":"a@b.test","password":"secret"}');
    expect(await readBoundedBody(request, MAX_LOGIN_BODY_BYTES)).toContain("a@b.test");
  });

  it("rejects a body whose declared Content-Length exceeds the limit", async () => {
    const request = makeRequest("{}", String(MAX_LOGIN_BODY_BYTES + 1));
    expect(await readBoundedBody(request, MAX_LOGIN_BODY_BYTES)).toBeNull();
  });

  it("rejects a body whose actual length exceeds the limit even without a Content-Length header", async () => {
    const oversized = "a".repeat(MAX_LOGIN_BODY_BYTES + 1);
    const request = makeRequest(oversized);
    expect(await readBoundedBody(request, MAX_LOGIN_BODY_BYTES)).toBeNull();
  });
});

describe("parseLoginBody", () => {
  it("accepts a well-formed body", () => {
    expect(parseLoginBody({ email: "a@b.test", password: "secret" })).toEqual({
      email: "a@b.test",
      password: "secret",
    });
  });

  it("rejects a non-object payload", () => {
    expect(parseLoginBody("a@b.test")).toBeNull();
    expect(parseLoginBody(null)).toBeNull();
    expect(parseLoginBody([1, 2])).toBeNull();
  });

  it("rejects unexpected extra fields", () => {
    expect(parseLoginBody({ email: "a@b.test", password: "secret", remember: true })).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(parseLoginBody({ email: "not-an-email", password: "secret" })).toBeNull();
  });

  it("rejects an empty password", () => {
    expect(parseLoginBody({ email: "a@b.test", password: "" })).toBeNull();
  });

  it("rejects non-string fields", () => {
    expect(parseLoginBody({ email: 123, password: "secret" })).toBeNull();
  });
});
