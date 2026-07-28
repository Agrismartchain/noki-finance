import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  cashHandoverStatusTone,
  cashSessionStatusTone,
  cashVarianceStatusTone,
  codCollectionStatusTone,
  reconciliationStatusTone,
} from "../status-maps";
import { FinanceStatusBadge } from "./finance-status-badge";

describe("FinanceStatusBadge", () => {
  it("renders the given label", () => {
    render(<FinanceStatusBadge label="Déclaré" tone="info" />);
    expect(screen.getByText("Déclaré")).toBeInTheDocument();
  });
});

describe("status-maps tone functions", () => {
  it("maps every real COD collection status to a defined tone", () => {
    expect(codCollectionStatusTone("DECLARED")).toBe("info");
    expect(codCollectionStatusTone("REMITTED")).toBe("warning");
    expect(codCollectionStatusTone("RECONCILED")).toBe("success");
    expect(codCollectionStatusTone("VOIDED")).toBe("neutral");
  });

  it("maps every real cash handover status to a defined tone", () => {
    expect(cashHandoverStatusTone("DRAFT")).toBe("neutral");
    expect(cashHandoverStatusTone("SUBMITTED")).toBe("info");
    expect(cashHandoverStatusTone("RECEIVED")).toBe("success");
    expect(cashHandoverStatusTone("REJECTED")).toBe("danger");
    expect(cashHandoverStatusTone("CANCELLED")).toBe("neutral");
  });

  it("maps every real cash session status to a defined tone", () => {
    expect(cashSessionStatusTone("OPEN")).toBe("info");
    expect(cashSessionStatusTone("CLOSED")).toBe("warning");
    expect(cashSessionStatusTone("RECONCILED")).toBe("success");
  });

  it("maps every real cash variance status to a defined tone", () => {
    expect(cashVarianceStatusTone("OPEN")).toBe("danger");
    expect(cashVarianceStatusTone("RESOLVED")).toBe("success");
    expect(cashVarianceStatusTone("WAIVED")).toBe("neutral");
  });

  it("maps every real reconciliation status to a defined tone", () => {
    expect(reconciliationStatusTone("DRAFT")).toBe("neutral");
    expect(reconciliationStatusTone("SUBMITTED")).toBe("info");
    expect(reconciliationStatusTone("APPROVED")).toBe("success");
    expect(reconciliationStatusTone("REJECTED")).toBe("danger");
  });

  it("falls back to neutral for an unrecognized status rather than throwing", () => {
    expect(codCollectionStatusTone("UNKNOWN")).toBe("neutral");
  });
});
