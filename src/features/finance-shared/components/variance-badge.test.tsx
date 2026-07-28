import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VarianceBadge, type VarianceBadgeLabels } from "./variance-badge";

const labels: VarianceBadgeLabels = {
  shortfall: "Manque",
  excess: "Excédent",
  resolved: "Résolu",
  waived: "Levé",
  balanced: "Équilibré",
};

describe("VarianceBadge", () => {
  it("shows shortfall for a negative variance while open", () => {
    render(<VarianceBadge status="OPEN" varianceAmount="-125.50" labels={labels} />);
    expect(screen.getByText("Manque")).toBeInTheDocument();
  });

  it("shows excess for a positive variance while open", () => {
    render(<VarianceBadge status="OPEN" varianceAmount="125.50" labels={labels} />);
    expect(screen.getByText("Excédent")).toBeInTheDocument();
  });

  it("shows balanced for a zero variance while open", () => {
    render(<VarianceBadge status="OPEN" varianceAmount="0.00" labels={labels} />);
    expect(screen.getByText("Équilibré")).toBeInTheDocument();
  });

  it("shows resolved regardless of the amount's sign once status is RESOLVED", () => {
    render(<VarianceBadge status="RESOLVED" varianceAmount="-125.50" labels={labels} />);
    expect(screen.getByText("Résolu")).toBeInTheDocument();
    expect(screen.queryByText("Manque")).not.toBeInTheDocument();
  });

  it("shows waived regardless of the amount's sign once status is WAIVED", () => {
    render(<VarianceBadge status="WAIVED" varianceAmount="125.50" labels={labels} />);
    expect(screen.getByText("Levé")).toBeInTheDocument();
    expect(screen.queryByText("Excédent")).not.toBeInTheDocument();
  });

  it("treats a negative-zero amount string as balanced, not as a shortfall", () => {
    render(<VarianceBadge status="OPEN" varianceAmount="-0.00" labels={labels} />);
    expect(screen.getByText("Équilibré")).toBeInTheDocument();
  });
});
