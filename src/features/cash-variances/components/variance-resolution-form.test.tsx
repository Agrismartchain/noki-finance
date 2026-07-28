import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VarianceResolutionForm } from "./variance-resolution-form";

const resolveVarianceAction = vi.fn();

vi.mock("../server/actions", () => ({
  resolveVarianceAction: (...args: unknown[]) => resolveVarianceAction(...args),
}));

const labels = {
  decisionLabel: "Decision",
  resolvedOption: "Resolve",
  waivedOption: "Waive",
  reasonLabel: "Reason",
  reasonRequired: "A reason is required",
  decisionRequired: "A decision is required",
  confirmTitle: "Confirm resolution",
  confirmDescription: "This action is final",
  submit: "Continue",
  confirm: "Confirm",
  dismiss: "Close",
  genericError: "Something went wrong",
  correlationLabel: "Reference",
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <VarianceResolutionForm varianceId="variance-1" labels={labels} />
    </NextIntlClientProvider>,
  );
}

describe("VarianceResolutionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a decision and a reason before proceeding to confirmation", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("A decision is required")).toBeInTheDocument();
    expect(screen.getByText("A reason is required")).toBeInTheDocument();
    expect(screen.queryByText("Confirm resolution")).not.toBeInTheDocument();
  });

  it("shows an explicit confirmation step before calling the resolve action", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("radio", { name: "Resolve" }));
    await user.type(screen.getByLabelText("Reason"), "Cashier confirmed the shortfall");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Confirm resolution")).toBeInTheDocument();
    expect(resolveVarianceAction).not.toHaveBeenCalled();
  });

  it("calls the resolve action with the decision and reason only after explicit confirmation", async () => {
    resolveVarianceAction.mockResolvedValueOnce({ ok: true, variance: { id: "variance-1", status: "RESOLVED" } });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("radio", { name: "Waive" }));
    await user.type(screen.getByLabelText("Reason"), "Below materiality threshold");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(resolveVarianceAction).toHaveBeenCalledTimes(1);
    const [id, body] = resolveVarianceAction.mock.calls[0] as [string, { resolutionStatus: string; reason: string }];
    expect(id).toBe("variance-1");
    expect(body).toEqual({ resolutionStatus: "WAIVED", reason: "Below materiality threshold" });
  });

  it("never allows editing a source amount -- the form only ever collects decision and reason", () => {
    renderForm();
    expect(screen.queryByLabelText(/expected/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/actual/i)).not.toBeInTheDocument();
  });
});
