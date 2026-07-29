"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import {
  approvePaymentMethod,
  createPaymentMethod,
  getSensitiveReference,
  revokePaymentMethod,
  suspendPaymentMethod,
  type CreatePaymentMethodInput,
  type PaymentMethodDto,
  type SensitiveReferenceDto,
} from "./client";

export type PaymentMethodActionResult = { ok: true; paymentMethod: PaymentMethodDto } | { ok: false; kind: string; correlationId?: string };
export type SensitiveReferenceActionResult = { ok: true; sensitiveReference: SensitiveReferenceDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): PaymentMethodActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for registering a new payment method. */
export async function createPaymentMethodAction(body: CreatePaymentMethodInput, idempotencyKey: string): Promise<PaymentMethodActionResult> {
  try {
    const paymentMethod = await createPaymentMethod(body, idempotencyKey, await actionContext());
    return { ok: true, paymentMethod };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for approving a payment method (PENDING_VERIFICATION -> ACTIVE). */
export async function approvePaymentMethodAction(id: string, body: { reason?: string }, idempotencyKey: string): Promise<PaymentMethodActionResult> {
  try {
    const paymentMethod = await approvePaymentMethod(id, body, idempotencyKey, await actionContext());
    return { ok: true, paymentMethod };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for suspending a payment method (ACTIVE -> SUSPENDED). */
export async function suspendPaymentMethodAction(id: string, body: { reason: string }, idempotencyKey: string): Promise<PaymentMethodActionResult> {
  try {
    const paymentMethod = await suspendPaymentMethod(id, body, idempotencyKey, await actionContext());
    return { ok: true, paymentMethod };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for revoking a payment method. */
export async function revokePaymentMethodAction(id: string, body: { reason: string }, idempotencyKey: string): Promise<PaymentMethodActionResult> {
  try {
    const paymentMethod = await revokePaymentMethod(id, body, idempotencyKey, await actionContext());
    return { ok: true, paymentMethod };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Server Action: the sole path to the sensitive-reference GET. Routed
 * through a Server Action (never a client-side fetch straight to noki-api)
 * so it always carries the actor's own httpOnly-cookie token, and is only
 * ever invoked from an explicit "Reveal" click -- never prefetched as part
 * of a normal page render.
 */
export async function revealSensitiveReferenceAction(id: string): Promise<SensitiveReferenceActionResult> {
  try {
    const sensitiveReference = await getSensitiveReference(id, await actionContext());
    return { ok: true, sensitiveReference };
  } catch (error) {
    if (error instanceof NokiApiError) {
      return { ok: false, kind: error.kind, correlationId: error.correlationId };
    }
    return { ok: false, kind: "unexpected" };
  }
}
