import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const fetchMeWithBackend = vi.fn();
const fetchCapabilitiesWithBackend = vi.fn();
const refreshWithBackend = vi.fn();

vi.mock("./backend", () => ({
  fetchCapabilitiesWithBackend: (...args: unknown[]) => fetchCapabilitiesWithBackend(...args),
  fetchMeWithBackend: (...args: unknown[]) => fetchMeWithBackend(...args),
  refreshWithBackend: (...args: unknown[]) => refreshWithBackend(...args),
}));

const { hasAnyCapability, hasAnyFinancePermission, hasCapability, hasPermission, resolveSession } = await import("./session");

const ME_DTO = {
  actorId: "actor-1",
  displayName: "Noki Finance Actor",
  email: "finance@example.test",
  memberships: [
    {
      membershipId: "m-1",
      organizationId: "org-1",
      countryScopes: [{ organizationCountryId: "oc-1", countryCode: "MA" }],
    },
  ],
};

const CAPABILITIES_DTO = {
  actorId: "actor-1",
  memberships: [
    {
      membershipId: "m-1",
      organizationId: "org-1",
      countryScopes: [{ organizationCountryId: "oc-1", countryCode: "MA" }],
      roles: [{ roleId: "role-1", code: "FINANCE", description: "Finance" }],
      permissionCodes: ["finance.cash.read", "auth.me.read"],
    },
  ],
  effectivePermissionCodes: ["finance.cash.read", "auth.me.read"],
  capabilities: ["finance.cash.read"],
};

describe("resolveSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCapabilitiesWithBackend.mockResolvedValue(CAPABILITIES_DTO);
  });

  it("is unauthenticated when there is no access token", async () => {
    const result = await resolveSession({});
    expect(result.status).toBe("unauthenticated");
    expect(fetchMeWithBackend).not.toHaveBeenCalled();
  });

  it("is authenticated with backend-derived capabilities and no frontend-invented permissions", async () => {
    fetchMeWithBackend.mockResolvedValueOnce(ME_DTO);

    const result = await resolveSession({ accessToken: "token" });

    expect(result.status).toBe("authenticated");
    if (result.status !== "authenticated") throw new Error("unreachable");
    expect(result.actor).toEqual({
      actorId: "actor-1",
      displayName: "Noki Finance Actor",
      email: "finance@example.test",
      memberships: [
        {
          membershipId: "m-1",
          organizationId: "org-1",
          countryScopes: [{ organizationCountryId: "oc-1", countryCode: "MA" }],
          roles: [{ roleId: "role-1", code: "FINANCE", description: "Finance" }],
          permissionCodes: ["auth.me.read", "finance.cash.read"],
        },
      ],
      effectivePermissionCodes: ["auth.me.read", "finance.cash.read"],
      capabilities: ["finance.cash.read"],
    });
    expect(hasCapability(result.actor, "finance.cash.read")).toBe(true);
    expect(hasCapability(result.actor, "finance.payout.read")).toBe(false);
    expect(hasPermission(result.actor, "auth.me.read")).toBe(true);
    expect(hasPermission(["settings.read"], "settings.read")).toBe(true);
    expect(hasPermission(["settings.read"], "settings.update")).toBe(false);
  });

  it("is forbidden (not unauthenticated) on a 403 from /me, without attempting a refresh", async () => {
    fetchMeWithBackend.mockRejectedValueOnce(new NokiApiError("forbidden", "Forbidden"));

    const result = await resolveSession({ accessToken: "token", refreshToken: "refresh", allowRefresh: true });

    expect(result.status).toBe("forbidden");
    expect(refreshWithBackend).not.toHaveBeenCalled();
  });

  it("is forbidden when /capabilities returns 403 after /me succeeds", async () => {
    fetchMeWithBackend.mockResolvedValueOnce(ME_DTO);
    fetchCapabilitiesWithBackend.mockRejectedValueOnce(new NokiApiError("forbidden", "Forbidden"));

    const result = await resolveSession({ accessToken: "token", refreshToken: "refresh", allowRefresh: true });

    expect(result.status).toBe("forbidden");
    expect(refreshWithBackend).not.toHaveBeenCalled();
  });

  it("is unauthenticated on a 401 when refresh is not allowed", async () => {
    fetchMeWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Access token is invalid"));

    const result = await resolveSession({ accessToken: "token", refreshToken: "refresh" });

    expect(result.status).toBe("unauthenticated");
    expect(refreshWithBackend).not.toHaveBeenCalled();
  });

  it("refreshes once and retries /me on a 401 when refresh is allowed", async () => {
    fetchMeWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Access token is invalid"));
    refreshWithBackend.mockResolvedValueOnce({
      tokenType: "Bearer",
      accessToken: "new-access",
      accessTokenExpiresIn: 900,
      refreshToken: "new-refresh",
      refreshTokenExpiresIn: 2_592_000,
    });
    fetchMeWithBackend.mockResolvedValueOnce(ME_DTO);

    const result = await resolveSession({ accessToken: "expired", refreshToken: "old-refresh", allowRefresh: true });

    expect(result.status).toBe("authenticated");
    if (result.status !== "authenticated") throw new Error("unreachable");
    expect(result.rotatedTokens).toEqual({
      accessToken: "new-access",
      accessTokenExpiresIn: 900,
      refreshToken: "new-refresh",
      refreshTokenExpiresIn: 2_592_000,
    });
    expect(refreshWithBackend).toHaveBeenCalledTimes(1);
    expect(fetchMeWithBackend).toHaveBeenCalledTimes(2);
    expect(fetchCapabilitiesWithBackend).toHaveBeenCalledTimes(1);
  });

  it("clears the session when the refresh attempt itself fails, without a second attempt", async () => {
    fetchMeWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Access token is invalid"));
    refreshWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Refresh token is invalid"));

    const result = await resolveSession({ accessToken: "expired", refreshToken: "reused-or-expired", allowRefresh: true });

    expect(result.status).toBe("unauthenticated");
    expect(refreshWithBackend).toHaveBeenCalledTimes(1);
    expect(fetchMeWithBackend).toHaveBeenCalledTimes(1);
  });

  it("does not attempt a refresh when no refresh token is available, even if allowed", async () => {
    fetchMeWithBackend.mockRejectedValueOnce(new NokiApiError("unauthorized", "Access token is invalid"));

    const result = await resolveSession({ accessToken: "expired", allowRefresh: true });

    expect(result.status).toBe("unauthenticated");
    expect(refreshWithBackend).not.toHaveBeenCalled();
  });
});

describe("hasAnyCapability", () => {
  it("is true when at least one of the given capabilities is present (OR semantics)", () => {
    expect(hasAnyCapability(["finance.payout.final_approve"], ["finance.payout.first_approve", "finance.payout.final_approve"])).toBe(true);
  });

  it("is false when none of the given capabilities are present", () => {
    expect(hasAnyCapability(["finance.cash.read"], ["finance.payout.first_approve", "finance.payout.final_approve"])).toBe(false);
  });
});

describe("hasAnyFinancePermission", () => {
  const baseActor = {
    actorId: "actor-1",
    displayName: "Actor",
    email: null,
    memberships: [],
    effectivePermissionCodes: [] as string[],
    capabilities: [] as string[],
  };

  it("is true for an actor holding any finance.* permission", () => {
    expect(hasAnyFinancePermission({ ...baseActor, capabilities: ["finance.dashboard.read"] })).toBe(true);
  });

  it("is false for an actor with no finance.* permission at all", () => {
    expect(hasAnyFinancePermission({ ...baseActor, capabilities: ["auth.me.read"] })).toBe(false);
  });

  it("excludes the unrelated seller.finance.* namespace", () => {
    expect(hasAnyFinancePermission({ ...baseActor, capabilities: ["seller.finance.summary.read"] })).toBe(false);
  });

  it("excludes the unrelated commerce.finance.* namespace", () => {
    expect(hasAnyFinancePermission({ ...baseActor, capabilities: ["commerce.finance.invoice.read"] })).toBe(false);
  });

  it("checks effectivePermissionCodes too, not only capabilities", () => {
    expect(hasAnyFinancePermission({ ...baseActor, effectivePermissionCodes: ["finance.audit.read"] })).toBe(true);
  });
});
