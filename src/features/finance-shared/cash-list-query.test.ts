import { describe, expect, it } from "vitest";

import { buildCashListSearchParams, parseCashListFilters, toLimitOffset } from "./cash-list-query";

const STATUSES = ["DRAFT", "SUBMITTED"] as const;

describe("parseCashListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseCashListFilters(new URLSearchParams(), STATUSES);
    expect(filters).toEqual({ currencyId: "", status: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
  });

  it("parses valid filter values", () => {
    const filters = parseCashListFilters(new URLSearchParams("currency=cur-1&status=SUBMITTED&dateFrom=2026-01-01&dateTo=2026-01-31&page=2&pageSize=50"), STATUSES);
    expect(filters).toEqual({ currencyId: "cur-1", status: "SUBMITTED", dateFrom: "2026-01-01", dateTo: "2026-01-31", page: 2, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter", () => {
    const filters = parseCashListFilters(new URLSearchParams("status=NOT_REAL"), STATUSES);
    expect(filters.status).toBe("");
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseCashListFilters(new URLSearchParams("pageSize=500"), STATUSES);
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildCashListSearchParams", () => {
  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("currency=cur-1&status=DRAFT&dateFrom=2026-01-01&dateTo=2026-01-31&page=3&pageSize=10");
    const filters = parseCashListFilters(original, STATUSES);
    const rebuilt = buildCashListSearchParams(filters);
    expect(parseCashListFilters(rebuilt, STATUSES)).toEqual(filters);
  });

  it("omits default values", () => {
    const params = buildCashListSearchParams({ currencyId: "", status: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });
});

describe("toLimitOffset", () => {
  it("converts page 1 to offset 0", () => {
    expect(toLimitOffset({ page: 1, pageSize: 25 })).toEqual({ limit: 25, offset: 0 });
  });

  it("converts page 3 with pageSize 10 to offset 20", () => {
    expect(toLimitOffset({ page: 3, pageSize: 10 })).toEqual({ limit: 10, offset: 20 });
  });
});
