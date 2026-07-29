import { describe, expect, it } from "vitest";

import { buildReportListSearchParams, isSensitiveKey, parseCountryCode, parseReportListFilters, parseReportType } from "./list-query";

describe("parseReportType", () => {
  it("accepts every one of the 10 verified report types", () => {
    for (const type of ["cod", "cash-sessions", "variances", "reconciliations", "fees", "invoices", "obligations", "payouts", "payment-method-status", "seller-settlements"]) {
      expect(parseReportType(type)).toBe(type);
    }
  });

  it("normalizes an unrecognized report type to no selection instead of accepting it", () => {
    expect(parseReportType("not-a-real-report")).toBe("");
  });

  it("normalizes a missing report type to no selection", () => {
    expect(parseReportType(undefined)).toBe("");
  });
});

describe("parseCountryCode", () => {
  it("uppercases a valid 2-char code", () => {
    expect(parseCountryCode("ma")).toBe("MA");
  });

  it("rejects a code that is not exactly 2 letters", () => {
    expect(parseCountryCode("MAR")).toBe("");
    expect(parseCountryCode("M")).toBe("");
    expect(parseCountryCode("12")).toBe("");
  });

  it("returns an empty string for a missing value", () => {
    expect(parseCountryCode(undefined)).toBe("");
  });
});

describe("parseReportListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseReportListFilters(new URLSearchParams());
    expect(filters).toEqual({
      reportType: "",
      countryCode: "",
      currencyId: "",
      status: "",
      counterpartyType: "",
      counterpartyId: "",
      sourceDomain: "",
      dateFrom: "",
      dateTo: "",
      search: "",
      page: 1,
      pageSize: 25,
    });
  });

  it("parses a full set of valid filters", () => {
    const filters = parseReportListFilters(
      new URLSearchParams("report=payouts&countryCode=ma&currencyId=cur-1&status=PAID&counterpartyType=SELLER&counterpartyId=seller-1&sourceDomain=COMMERCE&dateFrom=2026-01-01&dateTo=2026-01-31&search=foo&page=2&pageSize=50"),
    );
    expect(filters).toEqual({
      reportType: "payouts",
      countryCode: "MA",
      currencyId: "cur-1",
      status: "PAID",
      counterpartyType: "SELLER",
      counterpartyId: "seller-1",
      sourceDomain: "COMMERCE",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      search: "foo",
      page: 2,
      pageSize: 50,
    });
  });

  it("normalizes an unrecognized counterpartyType/sourceDomain to no filter", () => {
    const filters = parseReportListFilters(new URLSearchParams("counterpartyType=NOT_REAL&sourceDomain=NOT_REAL"));
    expect(filters.counterpartyType).toBe("");
    expect(filters.sourceDomain).toBe("");
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseReportListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildReportListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildReportListSearchParams({
      reportType: "",
      countryCode: "",
      currencyId: "",
      status: "",
      counterpartyType: "",
      counterpartyId: "",
      sourceDomain: "",
      dateFrom: "",
      dateTo: "",
      search: "",
      page: 1,
      pageSize: 25,
    });
    expect(params.toString()).toBe("");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("report=cod&countryCode=MA&status=DECLARED&page=3&pageSize=10");
    const filters = parseReportListFilters(original);
    const rebuilt = buildReportListSearchParams(filters);
    expect(parseReportListFilters(rebuilt)).toEqual(filters);
  });
});

describe("isSensitiveKey", () => {
  it("flags known sensitive key names case-insensitively", () => {
    expect(isSensitiveKey("sensitiveReference")).toBe(true);
    expect(isSensitiveKey("destinationFingerprint")).toBe(true);
    expect(isSensitiveKey("iban")).toBe(true);
    expect(isSensitiveKey("IBAN")).toBe(true);
    expect(isSensitiveKey("accessToken")).toBe(true);
    expect(isSensitiveKey("password")).toBe(true);
  });

  it("does not flag ordinary report row keys", () => {
    expect(isSensitiveKey("status")).toBe(false);
    expect(isSensitiveKey("amount")).toBe(false);
    expect(isSensitiveKey("counterpartyId")).toBe(false);
  });
});
