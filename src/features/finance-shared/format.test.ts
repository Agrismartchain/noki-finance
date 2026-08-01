import { describe, expect, it } from "vitest";

import { formatShortReference } from "./format";

describe("formatShortReference", () => {
  it("returns the first 8 characters of a valid UUID", () => {
    expect(formatShortReference("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "N/A")).toBe("a1b2c3d4");
  });

  it("returns the fallback for null", () => {
    expect(formatShortReference(null, "N/A")).toBe("N/A");
  });

  it("returns the fallback for undefined", () => {
    expect(formatShortReference(undefined, "N/A")).toBe("N/A");
  });

  it("returns the fallback for an empty string", () => {
    expect(formatShortReference("", "N/A")).toBe("N/A");
  });

  it("never throws and never fabricates an id", () => {
    expect(() => formatShortReference(null, "N/A")).not.toThrow();
    expect(formatShortReference(null, "N/A")).not.toContain("null");
  });
});
