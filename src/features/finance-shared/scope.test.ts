import { describe, expect, it } from "vitest";

import type { AdminCountryDto } from "./server/master-data";
import { resolveScopeCountryId } from "./scope";

const countries: AdminCountryDto[] = [
  { id: "country-real-id-ma", code: "MA", name: "Morocco", status: "ACTIVE", organizationsCount: 1, zonesCount: 1 },
  { id: "country-real-id-sn", code: "SN", name: "Senegal", status: "ACTIVE", organizationsCount: 1, zonesCount: 1 },
];

describe("resolveScopeCountryId", () => {
  it("resolves the real country.id for a matching countryCode", () => {
    const result = resolveScopeCountryId({ organizationId: "org-1", countryCode: "MA" }, countries);
    expect(result).toEqual({ organizationId: "org-1", countryId: "country-real-id-ma", countryCode: "MA" });
  });

  it("returns undefined when the scope is undefined", () => {
    expect(resolveScopeCountryId(undefined, countries)).toBeUndefined();
  });

  it("returns undefined when no country matches the countryCode", () => {
    const result = resolveScopeCountryId({ organizationId: "org-1", countryCode: "XX" }, countries);
    expect(result).toBeUndefined();
  });

  it("never returns organizationCountryId as a substitute for the real country.id", () => {
    // A caller who accidentally passes an organizationCountryId-shaped list (different id
    // space entirely) should never have that value silently returned as countryId --
    // the resolver only trusts `country.id` from the real master-data country match.
    const organizationCountryId = "org-country-assoc-id-not-a-real-country-id";
    const result = resolveScopeCountryId({ organizationId: "org-1", countryCode: "MA" }, countries);
    expect(result?.countryId).toBe("country-real-id-ma");
    expect(result?.countryId).not.toBe(organizationCountryId);
  });
});
