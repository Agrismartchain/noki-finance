import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { PayoutReportRow } from "../server/client";
import { PayoutTable } from "./payout-table";

const columnLabels = {
  reference: "Reference",
  counterparty: "Counterparty",
  amount: "Amount",
  paymentMethod: "Payment method",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

const statusLabels = {
  DRAFT: "Draft",
  PROPOSED: "Proposed",
  ON_HOLD: "On hold",
  PENDING_FIRST_APPROVAL: "Pending first approval",
  PENDING_FINAL_APPROVAL: "Pending final approval",
  APPROVED: "Approved",
  EXPORT_READY: "Export ready",
  SENT: "Sent",
  PAID: "Paid",
  FAILED: "Failed",
  MARKED_PAID: "Marked paid",
  CANCELLED: "Cancelled",
  RECONCILED: "Reconciled",
};

const rowWithNullRefs: PayoutReportRow = {
  id: "payout-1",
  organizationId: "org-1",
  countryId: "country-1",
  currencyId: "cur-1",
  currencyCode: "MAD",
  counterpartyType: "SELLER",
  counterpartyId: null,
  paymentMethodId: null,
  paymentMethodVersion: 1,
  destinationMasked: null,
  code: null,
  status: "PAID",
  totalAmount: "250.00",
  approvedAt: null,
  firstApprovedAt: null,
  finalApprovedAt: null,
  exportReadyAt: null,
  sentAt: null,
  paidAt: "2026-07-01T10:00:00.000Z",
  failedAt: null,
  cancelledAt: null,
  reconciledAt: null,
  exportChecksum: null,
  exportLineCount: null,
  externalReference: null,
  failureCode: null,
  retryCount: 0,
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

function renderTable(props: Partial<React.ComponentProps<typeof PayoutTable>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <PayoutTable
        items={[rowWithNullRefs]}
        total={1}
        locale="fr"
        statusLabels={statusLabels}
        columnLabels={columnLabels}
        tableAriaLabel="Payouts"
        emptyTitle="No data"
        emptyDescription="Nothing here"
        pageSizeLabel="Rows per page"
        previousLabel="Previous"
        nextLabel="Next"
        paginationAriaLabel="Pagination"
        notAvailableLabel="Not available"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("PayoutTable", () => {
  it("renders a row with null counterpartyId and paymentMethodId without throwing", () => {
    expect(() => renderTable()).not.toThrow();
  });

  it("renders the translated fallback label for a null counterpartyId and paymentMethodId", () => {
    renderTable();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("SELLER · Not available")).toBeInTheDocument();
  });

  it("never renders the literal string 'null'", () => {
    renderTable();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it("still renders the rest of the row (counterparty type, status, amount)", () => {
    renderTable();
    expect(screen.getByText(/SELLER/)).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("keeps the primary payout link and code-first / short-id fallback priority", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "payout-1" })).toBeInTheDocument();
  });
});
