"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import { createFeeAssessment, createFeeRule, type CreateFeeAssessmentInput, type CreateFeeRuleInput, type FeeAssessmentDto, type FeeRuleDto } from "./client";

export type FeeRuleActionResult = { ok: true; feeRule: FeeRuleDto } | { ok: false; kind: string; correlationId?: string };
export type FeeAssessmentActionResult = { ok: true; feeAssessment: FeeAssessmentDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

/** Server Action: BFF mutation boundary for creating a finance fee rule. */
export async function createFeeRuleAction(body: CreateFeeRuleInput, idempotencyKey: string): Promise<FeeRuleActionResult> {
  try {
    const feeRule = await createFeeRule(body, idempotencyKey, await actionContext());
    return { ok: true, feeRule };
  } catch (error) {
    if (error instanceof NokiApiError) {
      return { ok: false, kind: error.kind, correlationId: error.correlationId };
    }
    return { ok: false, kind: "unexpected" };
  }
}

/** Server Action: BFF mutation boundary for assessing a fee against an existing financial obligation. */
export async function createFeeAssessmentAction(body: CreateFeeAssessmentInput, idempotencyKey: string): Promise<FeeAssessmentActionResult> {
  try {
    const feeAssessment = await createFeeAssessment(body, idempotencyKey, await actionContext());
    return { ok: true, feeAssessment };
  } catch (error) {
    if (error instanceof NokiApiError) {
      return { ok: false, kind: error.kind, correlationId: error.correlationId };
    }
    return { ok: false, kind: "unexpected" };
  }
}
