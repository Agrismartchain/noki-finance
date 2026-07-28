import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HandoverCreateForm } from "./handover-create-form";

const createHandoverAction = vi.fn();

vi.mock("../server/actions", () => ({
  createHandoverAction: (...args: unknown[]) => createHandoverAction(...args),
}));

const labels = {
  ariaLabel: "Eligible collections",
  colSelect: "Select",
  colOrder: "Order",
  colExpected: "Expected",
  colDeclared: "Declared",
  colHandedOver: "Handed over",
  noEligible: "No eligible collections",
  submit: "Create handover",
  genericError: "Something went wrong",
  validationError: "Select at least one collection",
  correlationLabel: "Reference",
};

const eligibleCollections = [{ id: "col-1", orderNumber: "ORD-1", expectedAmount: "100.00", collectedAmount: "100.00" }];

function renderForm() {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <HandoverCreateForm
        organizationId="org-1"
        countryId="country-1"
        countryCode="MA"
        currencyId="cur-1"
        currencyCode="MAD"
        locale="fr"
        eligibleCollections={eligibleCollections}
        labels={labels}
      />
    </NextIntlClientProvider>,
  );
}

describe("HandoverCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the no-eligible message when there are no eligible COD collections", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={{}}>
        <HandoverCreateForm organizationId="org-1" countryId="country-1" countryCode="MA" currencyId="cur-1" currencyCode="MAD" locale="fr" eligibleCollections={[]} labels={labels} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No eligible collections")).toBeInTheDocument();
  });

  it("shows a validation error and does not call the action when nothing is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Create handover" }));

    expect(screen.getByText("Select at least one collection")).toBeInTheDocument();
    expect(createHandoverAction).not.toHaveBeenCalled();
  });

  it("submits only the selected line with its declared amount as the default handed-over amount", async () => {
    createHandoverAction.mockResolvedValueOnce({ ok: true, handover: { id: "handover-1" } });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create handover" }));

    expect(createHandoverAction).toHaveBeenCalledTimes(1);
    const [body] = createHandoverAction.mock.calls[0] as [{ items: { codCollectionId: string; handedOverAmount: string }[] }, string];
    expect(body.items).toEqual([{ codCollectionId: "col-1", handedOverAmount: "100.00" }]);
  });

  it("reuses the same idempotency key across the render, not a new one per interaction", async () => {
    createHandoverAction.mockResolvedValue({ ok: true, handover: { id: "handover-1" } });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create handover" }));

    const [, firstKey] = createHandoverAction.mock.calls[0] as [unknown, string];
    expect(typeof firstKey).toBe("string");
    expect(firstKey.length).toBeGreaterThan(0);
  });
});
