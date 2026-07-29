import { describe, expect, it } from "vitest";

import { buildObligationListSearchParams, parseObligationListFilters } from "./list-query";

describe("parseObligationListFilters", () => {
  it("defaults to page 1, pageSize 25, and no status filter for an empty URL", () => {
    const filters = parseObligationListFilters(new URLSearchParams());
    expect(filters).toEqual({ status: "", page: 1, pageSize: 25 });
  });

  it("parses a valid status filter", () => {
    const filters = parseObligationListFilters(new URLSearchParams("status=ON_HOLD&page=2&pageSize=50"));
    expect(filters).toEqual({ status: "ON_HOLD", page: 2, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter instead of rejecting the URL", () => {
    const filters = parseObligationListFilters(new URLSearchParams("status=NOT_A_REAL_STATUS"));
    expect(filters.status).toBe("");
  });

  it("normalizes a non-numeric page to the default", () => {
    const filters = parseObligationListFilters(new URLSearchParams("page=not-a-number"));
    expect(filters.page).toBe(1);
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseObligationListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildObligationListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildObligationListSearchParams({ status: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default filters", () => {
    const params = buildObligationListSearchParams({ status: "SETTLED", page: 2, pageSize: 25 });
    expect(params.get("status")).toBe("SETTLED");
    expect(params.get("page")).toBe("2");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("status=OPEN&page=4&pageSize=10");
    const filters = parseObligationListFilters(original);
    const rebuilt = buildObligationListSearchParams(filters);
    expect(parseObligationListFilters(rebuilt)).toEqual(filters);
  });
});
