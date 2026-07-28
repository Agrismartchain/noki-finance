import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CashSessionResponseDto } from "../server/client";
import { CloseSessionForm } from "./close-session-form";

const closeSessionAction = vi.fn();

vi.mock("../server/actions", () => ({
  closeSessionAction: (...args: unknown[]) => closeSessionAction(...args),
}));

const labels = {
  expectedLabel: "Expected",
  countedLabel: "Counted amount",
  previewLabel: "Indicative variance",
  previewWarning: "The server remains the source of truth",
  submit: "Close session",
  genericError: "Something went wrong",
  correlationLabel: "Reference",
};

// systemExpectedClosingAmount is typed as `Record<string, never>` in the
// generated schema (the canonical OpenAPI contract declares it as a bare
// `object`, even though the backend actually returns a decimal string) --
// the same documented quirk as MeResponseDto.email; cast defensively here too.
const session = {
  id: "session-1",
  status: "OPEN",
  organizationId: "org-1",
  countryId: "country-1",
  currencyId: "cur-1",
  cashierActorId: "actor-1",
  openingAmount: "0.00",
  systemExpectedClosingAmount: "100.00",
  openedAt: "2026-07-01T00:00:00.000Z",
} as unknown as CashSessionResponseDto;

function renderForm() {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <CloseSessionForm session={session} currencyCode="MAD" locale="fr" labels={labels} />
    </NextIntlClientProvider>,
  );
}

describe("CloseSessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits only countedClosingAmount -- never an expected amount field", async () => {
    closeSessionAction.mockResolvedValueOnce({ ok: true, session });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Counted amount"), "95.00");
    await user.click(screen.getByRole("button", { name: "Close session" }));

    expect(closeSessionAction).toHaveBeenCalledTimes(1);
    const [id, body] = closeSessionAction.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe("session-1");
    expect(Object.keys(body)).toEqual(["countedClosingAmount"]);
    expect(body.countedClosingAmount).toBe("95.00");
  });

  it("shows an indicative preview with the source-of-truth warning once a counted amount is entered", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Counted amount"), "95.00");

    expect(screen.getByText("Indicative variance")).toBeInTheDocument();
    expect(screen.getByText(/source of truth/)).toBeInTheDocument();
    expect(screen.getByText(/-5\.00/)).toBeInTheDocument();
  });

  it("disables the submit button until a counted amount is entered", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Close session" })).toBeDisabled();
  });
});
