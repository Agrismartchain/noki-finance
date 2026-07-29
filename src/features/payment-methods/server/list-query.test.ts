import { describe, expect, it } from "vitest";

import { buildPaymentMethodListSearchParams, parsePaymentMethodListFilters } from "./list-query";

describe("parsePaymentMethodListFilters", () => {
  it("defaults to page 1, pageSize 25, and no status filter for an empty URL", () => {
    const filters = parsePaymentMethodListFilters(new URLSearchParams());
    expect(filters).toEqual({ status: "", page: 1, pageSize: 25 });
  });

  it("parses a valid status filter", () => {
    const filters = parsePaymentMethodListFilters(new URLSearchParams("status=SUSPENDED&page=2&pageSize=50"));
    expect(filters).toEqual({ status: "SUSPENDED", page: 2, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter instead of rejecting the URL", () => {
    const filters = parsePaymentMethodListFilters(new URLSearchParams("status=NOT_A_REAL_STATUS"));
    expect(filters.status).toBe("");
  });

  it("normalizes a non-numeric page to the default", () => {
    const filters = parsePaymentMethodListFilters(new URLSearchParams("page=not-a-number"));
    expect(filters.page).toBe(1);
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parsePaymentMethodListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildPaymentMethodListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildPaymentMethodListSearchParams({ status: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default filters", () => {
    const params = buildPaymentMethodListSearchParams({ status: "ACTIVE", page: 2, pageSize: 25 });
    expect(params.get("status")).toBe("ACTIVE");
    expect(params.get("page")).toBe("2");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("status=REVOKED&page=4&pageSize=10");
    const filters = parsePaymentMethodListFilters(original);
    const rebuilt = buildPaymentMethodListSearchParams(filters);
    expect(parsePaymentMethodListFilters(rebuilt)).toEqual(filters);
  });
});
