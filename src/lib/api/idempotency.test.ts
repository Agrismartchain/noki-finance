import { describe, expect, it } from "vitest";

import { generateIdempotencyKey, IDEMPOTENCY_KEY_HEADER } from "./idempotency";

describe("generateIdempotencyKey", () => {
  it("generates a unique key for each call", () => {
    const first = generateIdempotencyKey();
    const second = generateIdempotencyKey();
    expect(first).not.toBe(second);
  });

  it("generates a well-formed UUID", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("IDEMPOTENCY_KEY_HEADER", () => {
  it("matches the exact header name noki-api declares via @ApiHeader", () => {
    expect(IDEMPOTENCY_KEY_HEADER).toBe("Idempotency-Key");
  });
});
