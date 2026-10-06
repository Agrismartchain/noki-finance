import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/finance-shared/server/master-data", () => ({
  listCountries: vi.fn(async () => [
    { id: "country-cg", code: "CG" },
    { id: "country-ci", code: "CI" },
  ]),
}));

import { fetchResourceList, parseResourceListFilters, buildResourceListSearchParams } from "./resource-list";

const actor = {
  memberships: [{ organizationId: "org-1", countryScopes: [{ countryCode: "CG", organizationCountryId: "oc-1" }] }],
} as never;

describe("parseResourceListFilters / buildResourceListSearchParams", () => {
  it("accepts only known statuses and bounds paging", () => {
    const filters = parseResourceListFilters(new URLSearchParams("status=OPEN&page=3&pageSize=500"), ["OPEN", "RESOLVED"]);
    expect(filters).toEqual({ status: "OPEN", page: 3, pageSize: 100 });
    expect(parseResourceListFilters(new URLSearchParams("status=DROP TABLE"), ["OPEN"]).status).toBe("");
    expect(buildResourceListSearchParams({ status: "OPEN", page: 2, pageSize: 25 }).toString()).toBe("status=OPEN&page=2");
  });
});

describe("fetchResourceList", () => {
  it("queries the API with the actor's own organization and resolved country id, never client-chosen scope", async () => {
    const list = vi.fn(async () => ({ items: [{ id: "x" }], total: 1 }));
    const result = await fetchResourceList(actor, { status: "OPEN", page: 1, pageSize: 25 }, { locale: "fr" }, list);
    expect(list).toHaveBeenCalledWith({ organizationId: "org-1", countryId: "country-cg", status: "OPEN", page: 1, pageSize: 25 });
    expect(result).toEqual({ status: "ok", items: [{ id: "x" }], total: 1 });
  });

  it("reports no-scope without calling the API when the actor has no country scope", async () => {
    const list = vi.fn();
    const result = await fetchResourceList({ memberships: [] } as never, { status: "", page: 1, pageSize: 25 }, { locale: "fr" }, list);
    expect(result).toEqual({ status: "no-scope" });
    expect(list).not.toHaveBeenCalled();
  });

  it("maps API failures to an error state instead of throwing", async () => {
    const result = await fetchResourceList(actor, { status: "", page: 1, pageSize: 25 }, { locale: "fr" }, async () => {
      throw new Error("boom");
    });
    expect(result).toEqual({ status: "error", correlationId: undefined });
  });
});
