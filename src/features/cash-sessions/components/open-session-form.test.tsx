import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenSessionForm } from "./open-session-form";

const openSessionAction = vi.fn();

vi.mock("../server/actions", () => ({
  openSessionAction: (...args: unknown[]) => openSessionAction(...args),
}));

const labels = {
  currencyLabel: "Currency",
  openingAmountLabel: "Opening float",
  submit: "Open session",
  genericError: "Something went wrong",
  validationError: "Select a currency and enter an amount",
  correlationLabel: "Reference",
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <OpenSessionForm organizationId="org-1" countryId="country-1" countryCode="MA" currencies={[{ id: "cur-1", label: "Moroccan Dirham (MAD)" }]} labels={labels} />
    </NextIntlClientProvider>,
  );
}

describe("OpenSessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the resolved scope (organizationId/countryId/countryCode) alongside the chosen currency and amount", async () => {
    openSessionAction.mockResolvedValueOnce({ ok: true, session: { id: "session-1" } });
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("Opening float"));
    await user.type(screen.getByLabelText("Opening float"), "50.00");
    await user.click(screen.getByRole("button", { name: "Open session" }));

    expect(openSessionAction).toHaveBeenCalledTimes(1);
    const [body] = openSessionAction.mock.calls[0] as [Record<string, unknown>];
    expect(body).toMatchObject({ organizationId: "org-1", countryId: "country-1", countryCode: "MA", currencyId: "cur-1", openingAmount: "50.00" });
  });
});
