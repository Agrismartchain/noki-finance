"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { approveReconciliation, createReconciliation, submitReconciliation, type CreateFinancialReconciliationDto, type FinancialReconciliationResponseDto } from "./client";

export type ReconciliationActionResult = { ok: true; reconciliation: FinancialReconciliationResponseDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): ReconciliationActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

export async function createReconciliationAction(body: CreateFinancialReconciliationDto, idempotencyKey: string): Promise<ReconciliationActionResult> {
  try {
    const reconciliation = await createReconciliation(body, idempotencyKey, await actionContext());
    return { ok: true, reconciliation };
  } catch (error) {
    return toResult(error);
  }
}

export async function submitReconciliationAction(id: string, idempotencyKey: string): Promise<ReconciliationActionResult> {
  try {
    const reconciliation = await submitReconciliation(id, idempotencyKey, await actionContext());
    return { ok: true, reconciliation };
  } catch (error) {
    return toResult(error);
  }
}

export async function approveReconciliationAction(id: string, idempotencyKey: string): Promise<ReconciliationActionResult> {
  try {
    const reconciliation = await approveReconciliation(id, idempotencyKey, await actionContext());
    return { ok: true, reconciliation };
  } catch (error) {
    return toResult(error);
  }
}
