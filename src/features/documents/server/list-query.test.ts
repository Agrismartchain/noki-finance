import { describe, expect, it } from "vitest";

import { buildDocumentListSearchParams, parseDocumentListFilters } from "./list-query";

describe("parseDocumentListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseDocumentListFilters(new URLSearchParams());
    expect(filters).toEqual({ status: "", counterpartyType: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
  });

  it("parses valid status and counterpartyType filters", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("status=APPROVED&counterpartyType=SELLER&page=2&pageSize=50"));
    expect(filters).toEqual({ status: "APPROVED", counterpartyType: "SELLER", dateFrom: "", dateTo: "", page: 2, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter instead of rejecting the URL", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("status=NOT_A_REAL_STATUS"));
    expect(filters.status).toBe("");
  });

  it("normalizes an unrecognized counterpartyType to no filter", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("counterpartyType=NOT_A_REAL_TYPE"));
    expect(filters.counterpartyType).toBe("");
  });

  it("passes through dateFrom/dateTo as-is", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("dateFrom=2026-01-01&dateTo=2026-01-31"));
    expect(filters.dateFrom).toBe("2026-01-01");
    expect(filters.dateTo).toBe("2026-01-31");
  });

  it("normalizes a non-numeric page to the default", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("page=not-a-number"));
    expect(filters.page).toBe(1);
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseDocumentListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildDocumentListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildDocumentListSearchParams({ status: "", counterpartyType: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default filters", () => {
    const params = buildDocumentListSearchParams({ status: "VOIDED", counterpartyType: "", dateFrom: "", dateTo: "", page: 2, pageSize: 25 });
    expect(params.get("status")).toBe("VOIDED");
    expect(params.get("page")).toBe("2");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("status=GENERATED&counterpartyType=DRIVER&dateFrom=2026-01-01&dateTo=2026-01-31&page=4&pageSize=10");
    const filters = parseDocumentListFilters(original);
    const rebuilt = buildDocumentListSearchParams(filters);
    expect(parseDocumentListFilters(rebuilt)).toEqual(filters);
  });
});
