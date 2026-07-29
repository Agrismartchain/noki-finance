"use server";

import { cookies, headers } from "next/headers";

import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import {
  approveDocument,
  createDocument,
  voidDocument,
  type ApproveDocumentInput,
  type CreateDocumentInput,
  type FinancialDocumentDto,
  type VoidDocumentInput,
} from "./client";

export type DocumentActionResult = { ok: true; document: FinancialDocumentDto } | { ok: false; kind: string; correlationId?: string };

async function actionContext(): Promise<{ accessToken?: string; locale?: string }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return { accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value, locale: headerStore.get("accept-language") ?? undefined };
}

function toResult(error: unknown): DocumentActionResult {
  if (error instanceof NokiApiError) {
    return { ok: false, kind: error.kind, correlationId: error.correlationId };
  }
  return { ok: false, kind: "unexpected" };
}

/** Server Action: BFF mutation boundary for generating a financial document. Only the fields GenerateFinancialDocumentDto accepts -- never a manually-typed total, status, or approver. */
export async function createDocumentAction(body: CreateDocumentInput, idempotencyKey: string): Promise<DocumentActionResult> {
  try {
    const document = await createDocument(body, idempotencyKey, await actionContext());
    return { ok: true, document };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for approving a document. Which statuses actually permit approval is enforced server-side only. */
export async function approveDocumentAction(id: string, body: ApproveDocumentInput, idempotencyKey: string): Promise<DocumentActionResult> {
  try {
    const document = await approveDocument(id, body, idempotencyKey, await actionContext());
    return { ok: true, document };
  } catch (error) {
    return toResult(error);
  }
}

/** Server Action: BFF mutation boundary for voiding a document -- the only state-changing action on an approved document. */
export async function voidDocumentAction(id: string, body: VoidDocumentInput, idempotencyKey: string): Promise<DocumentActionResult> {
  try {
    const document = await voidDocument(id, body, idempotencyKey, await actionContext());
    return { ok: true, document };
  } catch (error) {
    return toResult(error);
  }
}
