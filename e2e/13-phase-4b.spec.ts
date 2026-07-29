import { expect, test, type Page } from "@playwright/test";

import { loginAsFinanceUser, loginAsNonFinanceUser } from "./support/auth";

const ids = {
  obligation: "obligation-seed-1",
  feeRule: "fee-rule-seed-1",
  feeAssessment: "fee-assessment-seed-1",
  invoice: "document-seed-1",
  statement: "document-statement-seed-1",
  adjustment: "adjustment-seed-1",
  dispute: "dispute-seed-1",
  paymentMethod: "payment-method-seed-1",
  payout: "payout-seed-1",
  payoutHold: "payout-hold-seed-1",
  payoutFirst: "payout-first-seed-1",
  payoutFinal: "payout-final-seed-1",
  payoutApproved: "payout-approved-seed-1",
  payoutExportReady: "payout-export-ready-seed-1",
  payoutSentPaid: "payout-sent-paid-seed-1",
  payoutSentFailed: "payout-sent-failed-seed-1",
  payoutFailed: "payout-failed-seed-1",
  payoutPaid: "payout-paid-seed-1",
};

async function login(page: Page, locale = "fr") {
  await loginAsFinanceUser(page, locale);
}

async function expectNoGlobalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
}

async function confirmOpenDialog(page: Page, fill?: () => Promise<void>) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if (fill) await fill();
  await dialog.getByRole("button", { name: /^Confirmer$/ }).click();
}

async function runCurrentPageServerAction(page: Page, action: () => Promise<void>) {
  const actionUrl = page.url();
  const response = page.waitForResponse((candidate) => candidate.url() === actionUrl && candidate.request().method() === "POST" && candidate.status() === 200);
  await action();
  return response;
}

async function runCurrentPageServerActionAndReload(page: Page, action: () => Promise<void>) {
  await runCurrentPageServerAction(page, action);
  await page.reload({ waitUntil: "networkidle" });
}

test.describe.configure({ mode: "serial" });

test("phase 4B 01 obligations list/detail", async ({ page }) => {
  await login(page);
  await page.goto("/fr/obligations");
  await expect(page.getByRole("heading", { name: "Obligations financières" })).toBeVisible();
  await page.goto(`/fr/obligations/${ids.obligation}`);
  await expect(page.getByRole("heading", { name: "Détail de l'obligation" })).toBeVisible();
  await expect(page.getByText("Restant")).toBeVisible();
});

test("phase 4B 02 fee rules", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/fees/rules/${ids.feeRule}`);
  await expect(page.getByRole("heading", { name: "Détail de la règle" })).toBeVisible();
  await expect(page.getByText("PERCENTAGE")).toBeVisible();
  await expect(page.getByText("2.5000")).toBeVisible();
});

test("phase 4B 03 fee assessments", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/fees/assessments/${ids.feeAssessment}`);
  await expect(page.getByRole("heading", { name: "Détail de l'évaluation" })).toBeVisible();
  await expect(page.getByText(ids.obligation)).toBeVisible();
});

test("phase 4B 04 invoice detail", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/documents/${ids.invoice}`);
  await expect(page.getByRole("heading", { name: "Détail du document" })).toBeVisible();
  await expect(page.getByText("Facture")).toBeVisible();
  await expect(page.getByText("CONFIRMATION_FEE")).toBeVisible();
});

test("phase 4B 05 statement detail", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/documents/${ids.statement}`);
  await expect(page.getByText("Ce document est un relevé de règlement")).toBeVisible();
  await expect(page.getByText("SELLER_STATEMENT")).toBeVisible();
});

test("phase 4B 06 adjustment workflow", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/adjustments/${ids.adjustment}`);
  await expect(page.getByRole("heading", { name: "Détail de l'ajustement" })).toBeVisible();
  await page.getByRole("button", { name: "Approuver" }).click();
  await expect(page.getByText("APPLIED").or(page.getByText("APPROVED"))).toBeVisible();
});

test("phase 4B 07 dispute workflow", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/disputes/${ids.dispute}`);
  await expect(page.getByText("L'obligation liée est actuellement bloquée")).toBeVisible();
  await page.getByText("Libération", { exact: true }).click();
  await page.getByLabel("Motif").fill("Release after finance review");
  await page.getByRole("button", { name: "Continuer" }).click();
  await runCurrentPageServerActionAndReload(page, () => page.getByRole("button", { name: "Confirmer" }).click());
  await expect(page.getByRole("definition").filter({ hasText: /^Résolu$/ })).toBeVisible({ timeout: 15_000 });
});

test("phase 4B 08 payout list/detail", async ({ page }) => {
  await login(page);
  await page.goto("/fr/payouts");
  await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();
  await page.goto(`/fr/payouts/${ids.payout}`);
  await expect(page.getByRole("heading", { name: "Détail du payout" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "IBAN •••• 9012" })).toBeVisible();
});

test("phase 4B 09 payout hold/release", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutHold}`);
  await page.getByRole("button", { name: "Lever le hold" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Motif").fill("Reviewed and released");
  });
  await expect(page.getByText("Levé le")).toBeVisible();
});

test("phase 4B 10 payout first approval", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutFirst}`);
  await page.getByRole("button", { name: "Première approbation" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Motif").fill("First approval accepted");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^En attente approbation finale$/ })).toBeVisible();
});

test("phase 4B 11 payout final approval", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutFinal}`);
  await page.getByRole("button", { name: "Approbation finale" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Motif").fill("Final approval accepted");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^Approuvé$/ })).toBeVisible();
});

test("phase 4B 12 payout mark sent", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutExportReady}`);
  await page.getByRole("button", { name: "Marquer envoyé" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Référence externe").fill("bank-run-42");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^Envoyé$/ })).toBeVisible();
});

test("phase 4B 13 payout mark paid", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutSentPaid}`);
  await page.getByRole("button", { name: "Marquer payé" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Référence de preuve").fill("proof-42");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^Payé$/ })).toBeVisible();
});

test("phase 4B 14 payout failed/retry", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payouts/${ids.payoutSentFailed}`);
  await page.getByRole("button", { name: "Marquer échoué" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Code erreur").fill("BANK_TIMEOUT");
    await page.getByLabel("Motif").fill("Provider timeout");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^Échoué$/ })).toBeVisible();

  await page.goto(`/fr/payouts/${ids.payoutFailed}`);
  await page.getByRole("button", { name: "Réessayer" }).click();
  await confirmOpenDialog(page, async () => {
    await page.getByLabel("Motif").fill("Retry with same masked destination");
  });
  await expect(page.getByRole("definition").filter({ hasText: /^Prêt pour export$/ })).toBeVisible();
});

test("phase 4B 15 payment method creation", async ({ page }) => {
  await login(page);
  await page.goto("/fr/payment-methods/new");
  await page.getByLabel("Identifiant de la contrepartie").fill("seller-e2e");
  await page.getByLabel("Code fournisseur").fill("DEMO_BANK");
  await page.getByLabel("Libellé affiché").fill("E2E settlement account");
  await page.getByLabel("Destination masquée").fill("**** 7777");
  await page.getByLabel("Référence sensible opaque").fill("vault:e2e-settlement-account");
  await runCurrentPageServerAction(page, () => page.getByRole("button", { name: "Créer" }).click());
  await page.goto("/fr/payment-methods", { waitUntil: "networkidle" });
  await expect(page.getByText("**** 7777")).toBeVisible();
});

test("phase 4B 16 payment method approval", async ({ page }) => {
  await login(page);
  await page.goto(`/fr/payment-methods/${ids.paymentMethod}`);
  await runCurrentPageServerActionAndReload(page, () => page.getByRole("button", { name: "Approuver" }).click());
  await expect(page.getByText("Active")).toBeVisible({ timeout: 10_000 });
});

test("phase 4B 17 reports preview", async ({ page }) => {
  await login(page);
  await page.goto("/fr/reports?report=payouts");
  await expect(page.getByRole("heading", { name: "Rapports" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Prévisualisation du rapport" })).toBeVisible();
  await expect(page.getByText("PO-0001")).toBeVisible();
});

test("phase 4B 18 CSV export", async ({ page }) => {
  await login(page);
  await page.goto("/fr/reports?report=payouts");
  await page.getByRole("button", { name: "Exporter CSV" }).click();
  await expect(page.getByText("Checksum", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger le CSV" })).toBeVisible();
});

test("phase 4B 19 audit search", async ({ page }) => {
  await login(page);
  await page.goto("/fr/audit?action=finance.payout");
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await expect(page.getByText("finance.payout.prepare")).toBeVisible();
});

test("phase 4B 20 forbidden mutation", async ({ page }) => {
  await loginAsNonFinanceUser(page);
  await page.goto("/fr/payment-methods/new");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});

test("phase 4B 21 mobile 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto(`/fr/payouts/${ids.payout}`);
  await expect(page.getByRole("heading", { name: "Détail du payout" })).toBeVisible();
  await expectNoGlobalOverflow(page);
});

test("phase 4B 22 Arabic RTL", async ({ page }) => {
  await login(page, "ar");
  await page.goto(`/ar/payouts/${ids.payout}`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("definition").filter({ hasText: "IBAN •••• 9012" })).toBeVisible();
});

test("phase 4B 23 dark mode", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /sombre|dark/i }).click();
  await page.goto(`/fr/payouts/${ids.payout}`);
  await expect(page.locator("html")).toHaveAttribute("data-noki-theme", "dashboard-dark");
});
