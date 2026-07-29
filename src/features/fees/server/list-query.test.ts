import { describe, expect, it } from "vitest";

import { buildFeeAssessmentListSearchParams, parseFeeAssessmentListFilters } from "./list-query";

describe("parseFeeAssessmentListFilters", () => {
  it("defaults to page 1, pageSize 25, and no filters for an empty URL", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams());
    expect(filters).toEqual({ status: "", counterpartyType: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
  });

  it("parses valid status, counterpartyType and date-range filters", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams("status=VOIDED&counterpartyType=SELLER&dateFrom=2026-01-01&dateTo=2026-01-31&page=2&pageSize=50"));
    expect(filters).toEqual({ status: "VOIDED", counterpartyType: "SELLER", dateFrom: "2026-01-01", dateTo: "2026-01-31", page: 2, pageSize: 50 });
  });

  it("normalizes an unrecognized status to no filter instead of rejecting the URL", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams("status=NOT_A_REAL_STATUS"));
    expect(filters.status).toBe("");
  });

  it("normalizes an unrecognized counterpartyType to no filter", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams("counterpartyType=NOT_A_REAL_TYPE"));
    expect(filters.counterpartyType).toBe("");
  });

  it("normalizes a non-numeric page to the default", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams("page=not-a-number"));
    expect(filters.page).toBe(1);
  });

  it("clamps pageSize to the 100 maximum", () => {
    const filters = parseFeeAssessmentListFilters(new URLSearchParams("pageSize=999"));
    expect(filters.pageSize).toBe(100);
  });
});

describe("buildFeeAssessmentListSearchParams", () => {
  it("omits default values to keep the URL clean", () => {
    const params = buildFeeAssessmentListSearchParams({ status: "", counterpartyType: "", dateFrom: "", dateTo: "", page: 1, pageSize: 25 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default filters", () => {
    const params = buildFeeAssessmentListSearchParams({ status: "ASSESSED", counterpartyType: "DRIVER", dateFrom: "2026-01-01", dateTo: "", page: 2, pageSize: 25 });
    expect(params.get("status")).toBe("ASSESSED");
    expect(params.get("counterpartyType")).toBe("DRIVER");
    expect(params.get("dateFrom")).toBe("2026-01-01");
    expect(params.get("dateTo")).toBeNull();
    expect(params.get("page")).toBe("2");
  });

  it("round-trips through parse -> build -> parse", () => {
    const original = new URLSearchParams("status=ASSESSED&counterpartyType=AFFILIATE&dateFrom=2026-02-01&dateTo=2026-02-28&page=4&pageSize=10");
    const filters = parseFeeAssessmentListFilters(original);
    const rebuilt = buildFeeAssessmentListSearchParams(filters);
    expect(parseFeeAssessmentListFilters(rebuilt)).toEqual(filters);
  });
});
