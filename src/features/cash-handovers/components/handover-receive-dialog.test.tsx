import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CashHandoverResponseDto } from "../server/client";
import { HandoverReceiveDialog } from "./handover-receive-dialog";

const receiveHandoverAction = vi.fn();

vi.mock("../server/actions", () => ({
  receiveHandoverAction: (...args: unknown[]) => receiveHandoverAction(...args),
}));

const labels = {
  trigger: "Receive",
  title: "Receive handover",
  sessionLabel: "Cash session",
  lineDeclared: "Declared",
  lineHandedOver: "Handed over",
  lineReceived: "Received amount",
  confirm: "Confirm",
  cancel: "Close",
  noOpenSession: "No open session available",
  genericError: "Something went wrong",
  correlationLabel: "Reference",
};

const handover: CashHandoverResponseDto = {
  id: "handover-1",
  status: "SUBMITTED",
  organizationId: "org-1",
  countryId: "country-1",
  currencyId: "cur-1",
  totalHandedOverAmount: "100.00",
  totalReceivedAmount: "0.00",
  items: [{ id: "item-1", codCollectionId: "col-1", declaredAmountSnapshot: "100.00", handedOverAmount: "100.00", reconciledAmount: "0.00" }],
  createdAt: "2026-07-01T00:00:00.000Z",
};

function renderDialog(openSessions = [{ id: "session-1", label: "Session 1" }]) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <HandoverReceiveDialog handover={handover} currencyCode="MAD" locale="fr" openSessions={openSessions} labels={labels} />
    </NextIntlClientProvider>,
  );
}

describe("HandoverReceiveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a warning instead of the trigger when there is no compatible open session", () => {
    renderDialog([]);
    expect(screen.getByText("No open session available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receive" })).not.toBeInTheDocument();
  });

  it("opens the dialog and shows declared/handed-over as separate, non-editable figures per line", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Receive" }));

    expect(screen.getByText("Receive handover")).toBeInTheDocument();
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it("confirms with the session id and per-line received amounts", async () => {
    receiveHandoverAction.mockResolvedValueOnce({ ok: true, handover });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Receive" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(receiveHandoverAction).toHaveBeenCalledTimes(1);
    const [id, body] = receiveHandoverAction.mock.calls[0] as [string, { cashSessionId: string; items: { codCollectionId: string; receivedAmount: string }[] }];
    expect(id).toBe("handover-1");
    expect(body.cashSessionId).toBe("session-1");
    expect(body.items).toEqual([{ codCollectionId: "col-1", receivedAmount: "100.00" }]);
  });

  it("shows the correlation id in the error banner when the action fails", async () => {
    receiveHandoverAction.mockResolvedValueOnce({ ok: false, kind: "conflict", correlationId: "corr-99" });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Receive" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText(/corr-99/)).toBeInTheDocument();
  });
});
