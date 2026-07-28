import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { SanitizedActor } from "@/lib/auth";

const sidebarViewMock = vi.fn((props: { navigation: Array<{ key: string }> }) => props);

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "fr"),
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("./finance-sidebar-view", () => ({
  FinanceSidebarView: (props: { navigation: Array<{ key: string }> }) => sidebarViewMock(props),
}));

const { FinanceSidebar } = await import("./finance-sidebar");

type SidebarElementProps = {
  navigation: Array<{ key: string }>;
};

const baseActor: SanitizedActor = {
  actorId: "actor-1",
  displayName: "Actor",
  email: null,
  memberships: [],
  effectivePermissionCodes: ["auth.me.read"],
  capabilities: [],
};

describe("FinanceSidebar", () => {
  it("renders no navigation items when the actor has none of the FINANCE capabilities", async () => {
    const result = await FinanceSidebar({ actor: baseActor });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    expect(result.props.navigation).toEqual([]);
  });

  it("renders no navigation items at all for an unauthenticated (undefined) actor", async () => {
    const result = await FinanceSidebar({ actor: undefined });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    expect(result.props.navigation).toEqual([]);
  });

  it("shows only the dashboard when the actor holds only finance.dashboard.read", async () => {
    const result = await FinanceSidebar({
      actor: { ...baseActor, capabilities: ["finance.dashboard.read"] },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    expect(result.props.navigation.map((item) => item.key)).toEqual(["dashboard"]);
  });

  it("shows all 16 items when every capability is granted", async () => {
    const result = await FinanceSidebar({
      actor: {
        ...baseActor,
        capabilities: [
          "finance.dashboard.read",
          "finance.executive.read",
          "finance.cash.read",
          "finance.cash_variance.read",
          "finance.obligation.read",
          "finance.fee.read",
          "finance.document.read",
          "finance.adjustment.read",
          "finance.dispute.read",
          "finance.payout.read",
          "finance.payout.first_approve",
          "finance.payment_method.read",
          "finance.report.read",
          "finance.audit.read",
        ],
      },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    expect(result.props.navigation).toHaveLength(16);
  });

  it("shows the Approbations item when only the final_approve half of its OR-gated capability is granted", async () => {
    const result = await FinanceSidebar({
      actor: { ...baseActor, capabilities: ["finance.payout.final_approve"] },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    expect(result.props.navigation.map((item) => item.key)).toEqual(["approvals"]);
  });

  it("never shows an Operations-only item, even with every capability granted", async () => {
    const result = await FinanceSidebar({
      actor: { ...baseActor, capabilities: ["finance.dashboard.read", "operations.read", "commerce.inbound.read"] },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected FinanceSidebar to return a React element");

    const keys = result.props.navigation.map((item) => item.key);
    expect(keys).not.toContain("inbound");
  });
});
