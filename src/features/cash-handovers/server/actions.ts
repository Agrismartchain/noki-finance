"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { cancelHandover, createHandover, receiveHandover, rejectHandover, submitHandover, type CashHandoverResponseDto, type CancelCashHandoverDto, type CreateCashHandoverDto, type ReceiveCashHandoverDto, type RejectCashHandoverDto } from "./client";

export type HandoverActionResult = { ok: true; handover: CashHandoverResponseDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): HandoverActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for creating a handover draft. Never called from the browser directly against noki-api. */
export async function createHandoverAction(body: CreateCashHandoverDto, idempotencyKey: string): Promise<HandoverActionResult> {
  try {
    const handover = await createHandover(body, idempotencyKey, await actionContext());
    return { ok: true, handover };
  } catch (error) {
    return toResult(error);
  }
}

export async function submitHandoverAction(id: string, idempotencyKey: string): Promise<HandoverActionResult> {
  try {
    const handover = await submitHandover(id, idempotencyKey, await actionContext());
    return { ok: true, handover };
  } catch (error) {
    return toResult(error);
  }
}

export async function cancelHandoverAction(id: string, body: CancelCashHandoverDto, idempotencyKey: string): Promise<HandoverActionResult> {
  try {
    const handover = await cancelHandover(id, body, idempotencyKey, await actionContext());
    return { ok: true, handover };
  } catch (error) {
    return toResult(error);
  }
}

export async function rejectHandoverAction(id: string, body: RejectCashHandoverDto, idempotencyKey: string): Promise<HandoverActionResult> {
  try {
    const handover = await rejectHandover(id, body, idempotencyKey, await actionContext());
    return { ok: true, handover };
  } catch (error) {
    return toResult(error);
  }
}

export async function receiveHandoverAction(id: string, body: ReceiveCashHandoverDto, idempotencyKey: string): Promise<HandoverActionResult> {
  try {
    const handover = await receiveHandover(id, body, idempotencyKey, await actionContext());
    return { ok: true, handover };
  } catch (error) {
    return toResult(error);
  }
}
