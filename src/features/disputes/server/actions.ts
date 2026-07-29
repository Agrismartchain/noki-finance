"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { createDispute, resolveDispute, type CreateDisputeInput, type FinancialDisputeDto, type ResolveDisputeInput } from "./client";

export type DisputeActionResult = { ok: true; dispute: FinancialDisputeDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): DisputeActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for opening a dispute against an obligation. */
export async function createDisputeAction(body: CreateDisputeInput, idempotencyKey: string): Promise<DisputeActionResult> {
  try {
    const dispute = await createDispute(body, idempotencyKey, await actionContext());
    return { ok: true, dispute };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for resolving a dispute (RELEASE or ADJUSTMENT). */
export async function resolveDisputeAction(id: string, body: ResolveDisputeInput, idempotencyKey: string): Promise<DisputeActionResult> {
  try {
    const dispute = await resolveDispute(id, body, idempotencyKey, await actionContext());
    return { ok: true, dispute };
  } catch (error) {
    return toResult(error);
  }
}
