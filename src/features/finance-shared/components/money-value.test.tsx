import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MoneyValue } from "./money-value";

describe("MoneyValue", () => {
  it("formats a positive amount in its currency", () => {
    const { container } = render(<MoneyValue amount="1250.50" currencyCode="MAD" locale="fr" />);
    expect(container.textContent).toContain("MAD");
  });

  it("formats XAF with zero decimal digits (native Intl currency behavior)", () => {
    const { container } = render(<MoneyValue amount="5000" currencyCode="XAF" locale="fr" />);
    expect(container.textContent).not.toMatch(/5[.,]00/);
  });

  it("renders the empty placeholder for a null amount", () => {
    render(<MoneyValue amount={null} currencyCode="MAD" locale="fr" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the empty placeholder for an undefined amount", () => {
    render(<MoneyValue amount={undefined} currencyCode="MAD" locale="fr" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the empty placeholder for a blank amount string", () => {
    render(<MoneyValue amount="   " currencyCode="MAD" locale="fr" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("falls back to the raw amount and code when the currency code is missing", () => {
    render(<MoneyValue amount="42.00" currencyCode={null} locale="fr" />);
    expect(screen.getByText("42.00")).toBeInTheDocument();
  });

  it("falls back to the raw amount and code for an unrecognized currency code", () => {
    render(<MoneyValue amount="42.00" currencyCode="NOTACODE" locale="fr" />);
    expect(screen.getByText("42.00 NOTACODE")).toBeInTheDocument();
  });

  it("never throws on a non-numeric amount string", () => {
    expect(() => render(<MoneyValue amount="not-a-number" currencyCode="MAD" locale="fr" />)).not.toThrow();
  });

  it("supports a custom empty label", () => {
    render(<MoneyValue amount={null} currencyCode="MAD" locale="fr" emptyLabel="N/A" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
