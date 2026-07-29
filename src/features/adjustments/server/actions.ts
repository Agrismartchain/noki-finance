"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import {
  applyAdjustment,
  approveAdjustment,
  createAdjustment,
  rejectAdjustment,
  type ApproveAdjustmentInput,
  type CreateAdjustmentInput,
  type FinancialAdjustmentDto,
  type RejectAdjustmentInput,
} from "./client";

export type AdjustmentActionResult = { ok: true; adjustment: FinancialAdjustmentDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): AdjustmentActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for creating a financial adjustment. Only the 7 fields CreateFinancialAdjustmentDto accepts -- no direction, negative amount, status, approver, or resulting obligation id. */
export async function createAdjustmentAction(body: CreateAdjustmentInput, idempotencyKey: string): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await createAdjustment(body, idempotencyKey, await actionContext());
    return { ok: true, adjustment };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for approving an adjustment. */
export async function approveAdjustmentAction(id: string, body: ApproveAdjustmentInput, idempotencyKey: string): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await approveAdjustment(id, body, idempotencyKey, await actionContext());
    return { ok: true, adjustment };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for rejecting an adjustment. Deliberately does not accept/forward an Idempotency-Key -- the real endpoint has none. */
export async function rejectAdjustmentAction(id: string, body: RejectAdjustmentInput): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await rejectAdjustment(id, body, await actionContext());
    return { ok: true, adjustment };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for applying an approved adjustment. The controller takes no request body. */
export async function applyAdjustmentAction(id: string, idempotencyKey: string): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await applyAdjustment(id, idempotencyKey, await actionContext());
    return { ok: true, adjustment };
  } catch (error) {
    return toResult(error);
  }
}
