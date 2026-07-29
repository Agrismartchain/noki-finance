"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { allocateObligation, createObligation, type AllocateObligationInput, type CreateObligationInput, type FinancialObligationDto } from "./client";

export type ObligationActionResult = { ok: true; obligation: FinancialObligationDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): ObligationActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for creating a generic financial obligation. */
export async function createObligationAction(body: CreateObligationInput, idempotencyKey: string): Promise<ObligationActionResult> {
  try {
    const obligation = await createObligation(body, idempotencyKey, await actionContext());
    return { ok: true, obligation };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for allocating an obligation. Never recomputes remainingAmount -- the response is the sole source of truth. */
export async function allocateObligationAction(id: string, body: AllocateObligationInput, idempotencyKey: string): Promise<ObligationActionResult> {
  try {
    const obligation = await allocateObligation(id, body, idempotencyKey, await actionContext());
    return { ok: true, obligation };
  } catch (error) {
    return toResult(error);
  }
}
