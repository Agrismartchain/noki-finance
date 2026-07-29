import { describe, expect, it } from "vitest";

import { buildAuditListSearchParams, isSensitiveKey, parseAuditListFilters, parseCountryCode } from "./list-query";

describe("parseCountryCode", () => {
  it("uppercases a valid 2-char code", () => {
    expect(parseCountryCode("ma")).toBe("MA");
  });

  it("rejects a code that is not exactly 2 letters", () => {
    expect(parseCountryCode("MAR")).toBe("");
    expect(parseCountryCode("1")).toBe("");
  });
});

describe("parseAuditListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseAuditListFilters(new URLSearchParams());
    expect(filters).toEqual({
      actorId: "",
      action: "",
      resourceType: "",
      resourceId: "",
      countryCode: "",
      correlationId: "",
      dateFrom: "",
      dateTo: "",
      result: "",
      page: 1,
      pageSize: 25,
    });
  });

  it("parses a full set of valid filters", () => {
    const filters = parseAuditListFilters(
      new URLSearchParams(
        "actorId=actor-1&action=finance.obligation.allocate&resourceType=FinancialObligation&resourceId=o-1&countryCode=ma&correlationId=corr-1&dateFrom=2026-01-01&dateTo=2026-01-31&result=success&page=2&pageSize=50",
      ),
    );
    expect(filters).toEqual({
      actorId: "actor-1",
      action: "finance.obligation.allocate",
      resourceType: "FinancialObligation",
      resourceId: "o-1",
      countryCode: "MA",
      correlationId: "corr-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      result: "success",
      page: 2,
      pageSize: 50,
    });
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseAuditListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });

  it("truncates an overlong action to the 120-char server bound", () => {
    const filters = parseAuditListFilters(new URLSearchParams(`action=${"a".repeat(200)}`));
    expect(filters.action).toHaveLength(120);
  });
});

describe("buildAuditListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildAuditListSearchParams({
      actorId: "",
      action: "",
      resourceType: "",
      resourceId: "",
      countryCode: "",
      correlationId: "",
      dateFrom: "",
      dateTo: "",
      result: "",
      page: 1,
      pageSize: 25,
    });
    expect(params.toString()).toBe("");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("resourceType=PayoutBatch&resourceId=p-1&page=3&pageSize=10");
    const filters = parseAuditListFilters(original);
    const rebuilt = buildAuditListSearchParams(filters);
    expect(parseAuditListFilters(rebuilt)).toEqual(filters);
  });
});

describe("isSensitiveKey", () => {
  it("flags known sensitive key names case-insensitively", () => {
    expect(isSensitiveKey("secret")).toBe(true);
    expect(isSensitiveKey("apiToken")).toBe(true);
    expect(isSensitiveKey("Password")).toBe(true);
    expect(isSensitiveKey("destinationFingerprint")).toBe(true);
    expect(isSensitiveKey("sensitiveReference")).toBe(true);
    expect(isSensitiveKey("iban")).toBe(true);
  });

  it("does not flag ordinary audit metadata keys", () => {
    expect(isSensitiveKey("obligationId")).toBe(false);
    expect(isSensitiveKey("previousStatus")).toBe(false);
  });
});
