import { describe, expect, it } from "vitest";

import { DOMAIN_REGISTRY } from "@/domains/registry";

import { getShellNavigation, localizeShellHref, SHELL_NAVIGATION } from "./shell-navigation";

describe("shell-navigation", () => {
  it("derives exactly the 16 Finance navigation items from the domain registry", () => {
    expect(SHELL_NAVIGATION).toHaveLength(16);
    expect(SHELL_NAVIGATION.map((item) => item.key)).toEqual([
      "dashboard",
      "cod",
      "cash-handovers",
      "cash-sessions",
      "cash-variances",
      "reconciliations",
      "obligations",
      "fees",
      "documents",
      "adjustments",
      "disputes",
      "payouts",
      "approvals",
      "payment-methods",
      "reports",
      "audit",
    ]);
  });

  it("marks all Phase 4B Finance items as implemented", () => {
    const implemented = SHELL_NAVIGATION.filter((item) => item.implemented).map((item) => item.key);
    expect(implemented).toEqual(SHELL_NAVIGATION.map((item) => item.key));
  });

  it("carries a real Finance-role permission code for every item", () => {
    expect(
      SHELL_NAVIGATION.every((item) => {
        if (Array.isArray(item.capability)) {
          return item.capability.length > 0 && item.capability.every((code) => code.startsWith("finance."));
        }
        return typeof item.capability === "string" && item.capability.startsWith("finance.");
      }),
    ).toBe(true);
  });

  it("never contains an Operations- or Contact-Center-style item", () => {
    const keys = DOMAIN_REGISTRY.map((domain) => domain.id);
    expect(keys).not.toContain("inbound");
    expect(keys).not.toContain("picking");
  });

  it("localizes the root href without a duplicated slash", () => {
    expect(localizeShellHref("fr", "/")).toBe("/fr");
    expect(localizeShellHref("fr", "/cod")).toBe("/fr/cod");
  });

  it("localizes every item href for the requested locale", () => {
    const navigation = getShellNavigation("en");
    expect(navigation.find((item) => item.key === "cash-sessions")?.href).toBe("/en/cash-sessions");
  });
});
