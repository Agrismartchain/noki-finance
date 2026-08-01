import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { FeeAssessmentReportRow } from "../server/client";
import { FeeAssessmentTable } from "./fee-assessment-table";

const columnLabels = {
  reference: "Reference",
  obligationId: "Obligation",
  type: "Type",
  amount: "Amount",
  sourceDomain: "Source",
  counterparty: "Counterparty",
  status: "Status",
  effectiveAt: "Effective at",
};

const statusLabels = { ASSESSED: "Assessed", VOIDED: "Voided" };

const rowWithNullRefs: FeeAssessmentReportRow = {
  id: "fee-assessment-1",
  organizationId: "org-1",
  countryId: "country-1",
  currencyId: "cur-1",
  currencyCode: "MAD",
  financialObligationId: null,
  type: "PLATFORM_COMMISSION",
  amount: "12.50",
  sourceDomain: "COMMERCE",
  sourceReferenceType: "ORDER",
  sourceReferenceId: "order-1",
  counterpartyType: "SELLER",
  counterpartyId: null,
  status: "ASSESSED",
  effectiveAt: "2026-07-01T10:00:00.000Z",
  createdAt: "2026-07-01T10:00:00.000Z",
};

function renderTable(props: Partial<React.ComponentProps<typeof FeeAssessmentTable>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{}}>
      <FeeAssessmentTable
        items={[rowWithNullRefs]}
        total={1}
        locale="fr"
        canReadDetail={true}
        statusLabels={statusLabels}
        columnLabels={columnLabels}
        tableAriaLabel="Fee assessments"
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

describe("FeeAssessmentTable", () => {
  it("renders a row with null financialObligationId and counterpartyId without throwing", () => {
    expect(() => renderTable()).not.toThrow();
  });

  it("renders the translated fallback label for a null financialObligationId and counterpartyId", () => {
    renderTable();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("SELLER · Not available")).toBeInTheDocument();
  });

  it("never renders the literal string 'null'", () => {
    renderTable();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it("still renders the rest of the row (type, source domain, counterparty type)", () => {
    renderTable();
    expect(screen.getByText("PLATFORM_COMMISSION")).toBeInTheDocument();
    expect(screen.getByText("COMMERCE")).toBeInTheDocument();
    expect(screen.getByText(/SELLER/)).toBeInTheDocument();
  });

  it("keeps the primary fee detail link intact when id is valid", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "fee-asse" })).toBeInTheDocument();
  });
});
