"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import {
  cancelPayout,
  createPayoutHold,
  exportPayout,
  finalApprovePayout,
  firstApprovePayout,
  markPayoutFailed,
  markPayoutPaid,
  markPayoutSent,
  proposePayout,
  reconcilePayout,
  releasePayoutHold,
  retryPayout,
  type CancelPayoutInput,
  type CreatePayoutHoldInput,
  type ExportPayoutInput,
  type MarkPayoutFailedInput,
  type MarkPayoutPaidInput,
  type MarkPayoutSentInput,
  type PayoutDecisionInput,
  type PayoutDetailDto,
  type ProposePayoutInput,
  type ReconcilePayoutInput,
  type ReleasePayoutHoldInput,
  type RetryPayoutInput,
} from "./client";

export type PayoutActionResult = { ok: true; payout: PayoutDetailDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): PayoutActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for proposing a new payout batch. */
export async function proposePayoutAction(body: ProposePayoutInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await proposePayout(body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for placing a hold on a payout. */
export async function createPayoutHoldAction(id: string, body: CreatePayoutHoldInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await createPayoutHold(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for releasing an active hold. */
export async function releasePayoutHoldAction(id: string, holdId: string, body: ReleasePayoutHoldInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await releasePayoutHold(id, holdId, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Server Action: BFF mutation boundary for the first approval stage. Maker/checker rules
 * (same actor cannot prepare and approve, cannot perform both approval stages, cannot
 * approve after modifying the payment method) are never checked here -- the API is the
 * sole authority and a 409/403 surfaces through the generic error result below.
 */
export async function firstApprovePayoutAction(id: string, body: PayoutDecisionInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await firstApprovePayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for the final approval stage. Same maker/checker caveat as firstApprovePayoutAction. */
export async function finalApprovePayoutAction(id: string, body: PayoutDecisionInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await finalApprovePayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for marking a payout export-ready. */
export async function exportPayoutAction(id: string, body: ExportPayoutInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await exportPayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for marking a payout sent. */
export async function markPayoutSentAction(id: string, body: MarkPayoutSentInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await markPayoutSent(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for marking a payout paid. Never accepts an amount override -- the body has no such field. */
export async function markPayoutPaidAction(id: string, body: MarkPayoutPaidInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await markPayoutPaid(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for recording a send failure. */
export async function markPayoutFailedAction(id: string, body: MarkPayoutFailedInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await markPayoutFailed(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for retrying a failed payout. */
export async function retryPayoutAction(id: string, body: RetryPayoutInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await retryPayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for cancelling a payout. */
export async function cancelPayoutAction(id: string, body: CancelPayoutInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await cancelPayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for reconciling a paid payout. */
export async function reconcilePayoutAction(id: string, body: ReconcilePayoutInput, idempotencyKey: string): Promise<PayoutActionResult> {
  try {
    const payout = await reconcilePayout(id, body, idempotencyKey, await actionContext());
    return { ok: true, payout };
  } catch (error) {
    return toResult(error);
  }
}
