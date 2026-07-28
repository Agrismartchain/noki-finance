import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FinancialReconciliationResponseDto } from "../server/client";
import { ReconciliationApprovalState } from "./reconciliation-approval-state";

const submitReconciliationAction = vi.fn();
const approveReconciliationAction = vi.fn();

vi.mock("../server/actions", () => ({
  submitReconciliationAction: (...args: unknown[]) => submitReconciliationAction(...args),
  approveReconciliationAction: (...args: unknown[]) => approveReconciliationAction(...args),
}));

const labels = {
  makerCheckerNote: "Maker/checker is enforced server-side",
  submit: "Submit",
  approve: "Approve",
  genericError: "Something went wrong",
  correlationLabel: "Reference",
  noActionAvailable: "No action available",
};

function makeReconciliation(status: FinancialReconciliationResponseDto["status"]): FinancialReconciliationResponseDto {
  return {
    id: "reconciliation-1",
    status,
    cashSessionId: "session-1",
    expectedAmount: "100.00",
    receivedAmount: "95.00",
    varianceAmount: "-5.00",
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

function renderState(reconciliation: FinancialReconciliationResponseDto, canSubmit: boolean, canApprove: boolean) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <ReconciliationApprovalState reconciliation={reconciliation} canSubmit={canSubmit} canApprove={canApprove} labels={labels} />
    </NextIntlClientProvider>,
  );
}

describe("ReconciliationApprovalState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always shows the maker/checker explanation banner", () => {
    renderState(makeReconciliation("DRAFT"), true, true);
    expect(screen.getByText("Maker/checker is enforced server-side")).toBeInTheDocument();
  });

  it("shows Submit for a DRAFT reconciliation when the actor can submit", () => {
    renderState(makeReconciliation("DRAFT"), true, true);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("shows Approve for a SUBMITTED reconciliation when the actor can approve", () => {
    renderState(makeReconciliation("SUBMITTED"), true, true);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("shows no action for a DRAFT reconciliation when the actor lacks submit permission", () => {
    renderState(makeReconciliation("DRAFT"), false, true);
    expect(screen.getByText("No action available")).toBeInTheDocument();
  });

  it("shows no action for an APPROVED reconciliation regardless of permissions", () => {
    renderState(makeReconciliation("APPROVED"), true, true);
    expect(screen.getByText("No action available")).toBeInTheDocument();
  });

  it("calls submitReconciliationAction when Submit is clicked", async () => {
    submitReconciliationAction.mockResolvedValueOnce({ ok: true, reconciliation: makeReconciliation("SUBMITTED") });
    const user = userEvent.setup();
    renderState(makeReconciliation("DRAFT"), true, true);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(submitReconciliationAction).toHaveBeenCalledWith("reconciliation-1", expect.any(String));
  });

  it("calls approveReconciliationAction when Approve is clicked and surfaces a server-side rejection (e.g. same-actor maker/checker conflict)", async () => {
    approveReconciliationAction.mockResolvedValueOnce({ ok: false, kind: "forbidden", correlationId: "corr-42" });
    const user = userEvent.setup();
    renderState(makeReconciliation("SUBMITTED"), true, true);

    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(approveReconciliationAction).toHaveBeenCalledWith("reconciliation-1", expect.any(String));
    expect(await screen.findByText(/corr-42/)).toBeInTheDocument();
  });
});
