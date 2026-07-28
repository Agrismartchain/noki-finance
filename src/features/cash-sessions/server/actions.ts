"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { closeSession, openSession, type CashSessionResponseDto, type CloseCashSessionDto, type OpenCashSessionDto } from "./client";

export type SessionActionResult = { ok: true; session: CashSessionResponseDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): SessionActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

export async function openSessionAction(body: OpenCashSessionDto, idempotencyKey: string): Promise<SessionActionResult> {
  try {
    const session = await openSession(body, idempotencyKey, await actionContext());
    return { ok: true, session };
  } catch (error) {
    return toResult(error);
  }
}

export async function closeSessionAction(id: string, body: CloseCashSessionDto, idempotencyKey: string): Promise<SessionActionResult> {
  try {
    const session = await closeSession(id, body, idempotencyKey, await actionContext());
    return { ok: true, session };
  } catch (error) {
    return toResult(error);
  }
}
