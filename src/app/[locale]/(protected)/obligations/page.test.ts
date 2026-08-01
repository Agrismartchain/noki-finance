import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminCountryDto } from "@/features/finance-shared/server/master-data";

const listCountriesMock = vi.fn();
const listObligationsMock = vi.fn();

vi.mock("@/features/finance-shared/server/master-data", () => ({
  listCountries: listCountriesMock,
}));

vi.mock("@/features/obligations/server/client", () => ({
  listObligations: listObligationsMock,
}));

const { fetchObligationListData } = await import("./page");

const countries: AdminCountryDto[] = [{ id: "country-real-id-ma", code: "MA", name: "Morocco", status: "ACTIVE", organizationsCount: 1, zonesCount: 1 }];

const filters = { status: "" as const, page: 1, pageSize: 25 };
const context = { accessToken: "token-1", locale: "fr" };

describe("fetchObligationListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the real country.id via listCountries and passes organizationId + countryId + pagination to listObligations", async () => {
    listCountriesMock.mockResolvedValueOnce(countries);
    listObligationsMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 25 });

    const result = await fetchObligationListData({ organizationId: "org-1", countryCode: "MA" }, filters, context);

    expect(result.status).toBe("ok");
    expect(listObligationsMock).toHaveBeenCalledWith({ organizationId: "org-1", countryId: "country-real-id-ma", status: undefined, page: 1, pageSize: 25 }, context);
  });

  it("never sends organizationCountryId in place of the real country.id", async () => {
    listCountriesMock.mockResolvedValueOnce(countries);
    listObligationsMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 25 });

    await fetchObligationListData({ organizationId: "org-1", countryCode: "MA" }, filters, context);

    expect(listObligationsMock.mock.calls).toHaveLength(1);
    const [query] = listObligationsMock.mock.calls[0]!;
    expect(query.countryId).toBe("country-real-id-ma");
  });

  it("returns no-scope and never calls listObligations when the scope is undefined", async () => {
    const result = await fetchObligationListData(undefined, filters, context);

    expect(result).toEqual({ status: "no-scope" });
    expect(listCountriesMock).not.toHaveBeenCalled();
    expect(listObligationsMock).not.toHaveBeenCalled();
  });

  it("returns no-scope and never calls listObligations when no country matches the scope's countryCode", async () => {
    listCountriesMock.mockResolvedValueOnce(countries);

    const result = await fetchObligationListData({ organizationId: "org-1", countryCode: "ZZ" }, filters, context);

    expect(result).toEqual({ status: "no-scope" });
    expect(listObligationsMock).not.toHaveBeenCalled();
  });
});
