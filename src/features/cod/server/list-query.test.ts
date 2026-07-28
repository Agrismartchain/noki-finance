import { describe, expect, it } from "vitest";

import { buildCodListSearchParams, parseCodListFilters } from "./list-query";

describe("parseCodListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseCodListFilters(new URLSearchParams());
    expect(filters).toEqual({ search: "", status: "", countryId: "", currencyId: "", page: 1, pageSize: 25 });
  });

  it("parses valid filter values", () => {
    const filters = parseCodListFilters(new URLSearchParams("search=ORD-1&status=DECLARED&country=c-1&currency=cur-1&page=3&pageSize=50"));
    expect(filters).toEqual({ search: "ORD-1", status: "DECLARED", countryId: "c-1", currencyId: "cur-1", page: 3, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter instead of rejecting the URL", () => {
    const filters = parseCodListFilters(new URLSearchParams("status=NOT_A_REAL_STATUS"));
    expect(filters.status).toBe("");
  });

  it("normalizes a non-numeric page to the default", () => {
    const filters = parseCodListFilters(new URLSearchParams("page=not-a-number"));
    expect(filters.page).toBe(1);
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseCodListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });

  it("falls back to the default pageSize when given a non-positive value", () => {
    const filters = parseCodListFilters(new URLSearchParams("pageSize=0"));
    expect(filters.pageSize).toBe(25);
  });

  it("truncates an overlong search value to 160 characters", () => {
    const filters = parseCodListFilters(new URLSearchParams(`search=${"a".repeat(200)}`));
    expect(filters.search).toHaveLength(160);
  });
});

describe("buildCodListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildCodListSearchParams({ search: "", status: "", countryId: "", currencyId: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default filters", () => {
    const params = buildCodListSearchParams({ search: "ORD-1", status: "DECLARED", countryId: "", currencyId: "", page: 2, pageSize: 25 });
    expect(params.get("search")).toBe("ORD-1");
    expect(params.get("status")).toBe("DECLARED");
    expect(params.get("page")).toBe("2");
    expect(params.has("country")).toBe(false);
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("search=x&status=REMITTED&country=c-9&currency=cur-9&page=4&pageSize=10");
    const filters = parseCodListFilters(original);
    const rebuilt = buildCodListSearchParams(filters);
    expect(parseCodListFilters(rebuilt)).toEqual(filters);
  });
});
