import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { AdminFinanceCodCollectionDto } from "../server/client";
import { CodTable } from "./cod-table";

const columnLabels = {
  orderNumber: "Order",
  organization: "Organization",
  country: "Country",
  currency: "Currency",
  expected: "Expected",
  declared: "Declared amount",
  status: "Status",
  declaredAt: "Declared on",
};

const statusLabels = { DECLARED: "Declared", VOIDED: "Voided", REMITTED: "Remitted", RECONCILED: "Reconciled" };

const items: AdminFinanceCodCollectionDto[] = [
  {
    id: "col-1",
    organizationId: "org-1",
    organizationName: "Acme Org",
    countryId: "country-1",
    countryCode: "MA",
    currencyId: "cur-1",
    currencyCode: "MAD",
    orderId: "order-1",
    orderNumber: "ORD-1001",
    deliveryShipmentId: "ship-1",
    expectedAmount: "150.00",
    collectedAmount: "150.00",
    status: "DECLARED",
    declaredAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
];

function renderTable(props: Partial<React.ComponentProps<typeof CodTable>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <CodTable
        items={items}
        total={1}
        locale="fr"
        columnLabels={columnLabels}
        statusLabels={statusLabels}
        tableAriaLabel="COD list"
        emptyTitle="No data"
        emptyDescription="Nothing here"
        pageSizeLabel="Rows per page"
        previousLabel="Previous"
        nextLabel="Next"
        paginationAriaLabel="Pagination"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("CodTable", () => {
  it("renders a row for each collection with its order number as a link", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "ORD-1001" })).toBeInTheDocument();
  });

  it("renders the translated status label, not the raw backend code", () => {
    renderTable();
    expect(screen.getByText("Declared")).toBeInTheDocument();
  });

  it("renders the empty state when there are no items", () => {
    renderTable({ items: [], total: 0 });
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    renderTable({ total: 200 });
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
});
