"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { resolveVariance, type CashVarianceResponseDto, type ResolveCashVarianceDto } from "./client";

export type VarianceActionResult = { ok: true; variance: CashVarianceResponseDto } | { ok: false; kind: string; correlationId?: string };

export async function resolveVarianceAction(id: string, body: ResolveCashVarianceDto, idempotencyKey: string): Promise<VarianceActionResult> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const context = { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
    const variance = await resolveVariance(id, body, idempotencyKey, context);
    return { ok: true, variance };
  } catch (error) {
    if (error instanceof NokiApiError) {
      return { ok: false, kind: error.kind, correlationId: error.correlationId };
    }
    return { ok: false, kind: "unexpected" };
  }
}
