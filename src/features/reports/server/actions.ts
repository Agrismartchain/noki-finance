"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { exportReport, type ExportReportQuery, type FinanceExportResponse } from "./client";
import type { ReportType } from "./list-query";

export type ReportExportActionResult = { ok: true; export: FinanceExportResponse; generatedAt: string } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): ReportExportActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/**
 * Server Action: BFF boundary for generating a governed Finance CSV export.
 * A Server Action (not a route handler) because the browser never holds
 * the access token -- this mirrors obligations/server/actions.ts. Not
 * documented in the module's file list but required for the "Export CSV"
 * button (a Client Component) to reach the NOKI API at all.
 * `generatedAt` is captured here (server clock, at the moment the export
 * succeeds) since FinanceExportDto itself has no generation timestamp
 * field -- it is UI metadata about when the export ran, not a claim about
 * a field the API returned.
 */
export async function exportReportAction(reportType: ReportType, query: ExportReportQuery): Promise<ReportExportActionResult> {
  try {
    const result = await exportReport(reportType, query, await actionContext());
    return { ok: true, export: result, generatedAt: new Date().toISOString() };
  } catch (error) {
    return toResult(error);
  }
}
