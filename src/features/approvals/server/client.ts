import { listInvoiceDocuments } from "@/features/documents/server/client";
import { listPaymentMethods } from "@/features/payment-methods/server/client";
import { listPayouts } from "@/features/payouts/server/client";
import type { NokiRequestContext } from "@/lib/api/request-context";

const QUEUE_PAGE_SIZE = 50;

export type SettledResult<T> = { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };

async function settle<T>(promise: Promise<T>): Promise<SettledResult<T>> {
  try {
    return { status: "fulfilled", value: await promise };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

/** One normalized row across every composed approval source -- the shape the queue UI actually renders. */
export interface ApprovalQueueRow {
  resourceType: "payout" | "paymentMethod" | "invoice";
  id: string;
  reference: string;
  /** Server-provided decimal amount, or null when the source resource has no single amount (e.g. a payment method). Never computed client-side. */
  amount: string | null;
  currencyCode: string | null;
  /** The resource's own requester/creator field when the underlying list source actually returns one -- null is a documented gap, never a fabricated actor id. */
  requester: string | null;
  date: string;
  stage: string;
  href: string;
}

export interface ApprovalsScope {
  organizationId: string;
  countryCode: string;
}

export interface FetchApprovalsQueueOptions {
  scope: ApprovalsScope;
  /** Each flag is an AND of the specific act-on capability and the underlying read/report capability needed just to list the section -- resolved by the caller (the page), not here. */
  canListPayoutFirstApprove: boolean;
  canListPayoutFinalApprove: boolean;
  canListPaymentMethods: boolean;
  canListInvoices: boolean;
}

export interface ApprovalsQueueResult {
  payoutFirstApprove: SettledResult<ApprovalQueueRow[]>;
  payoutFinalApprove: SettledResult<ApprovalQueueRow[]>;
  paymentMethodsPending: SettledResult<ApprovalQueueRow[]>;
  invoicesPending: SettledResult<ApprovalQueueRow[]>;
}

const EMPTY_SECTION: SettledResult<ApprovalQueueRow[]> = { status: "fulfilled", value: [] };

/**
 * Composes the Finance approvals queue from four independent, already-existing
 * per-entity endpoints -- there is NO unified Finance approvals-queue endpoint (verified:
 * finance-phase2.service.ts never writes to the generic ApprovalRequest model behind
 * /v1/admin/approvals, which is a completely separate system Finance items never appear
 * in). Adjustments are deliberately not composed here at all -- there is no list/report
 * endpoint for adjustments (verified); that gap is surfaced as an explanatory Alert in the
 * UI, not faked as an empty/successful section. Each section is only fetched when the
 * caller already holds the capability to both list and act on it (resolved by the page,
 * not here); a Promise.allSettled-style partial-failure result is returned so one failing
 * section never blocks the others, matching the dashboard's established pattern.
 */
export async function fetchApprovalsQueue(options: FetchApprovalsQueueOptions, context: NokiRequestContext): Promise<ApprovalsQueueResult> {
  const { scope, canListPayoutFirstApprove, canListPayoutFinalApprove, canListPaymentMethods, canListInvoices } = options;

  const [payoutFirstApprove, payoutFinalApprove, paymentMethodsPending, invoicesPending] = await Promise.all([
    canListPayoutFirstApprove
      ? settle(
          listPayouts({ organizationId: scope.organizationId, countryCode: scope.countryCode, status: "PENDING_FIRST_APPROVAL", page: 1, pageSize: QUEUE_PAGE_SIZE }, context).then((response) =>
            response.items.map(
              (row): ApprovalQueueRow => ({
                resourceType: "payout",
                id: row.id,
                reference: row.code ?? row.id.slice(0, 8),
                amount: row.totalAmount,
                currencyCode: row.currencyCode,
                requester: null,
                date: row.createdAt,
                stage: row.status,
                href: `/payouts/${row.id}`,
              }),
            ),
          ),
        )
      : Promise.resolve(EMPTY_SECTION),
    canListPayoutFinalApprove
      ? settle(
          listPayouts({ organizationId: scope.organizationId, countryCode: scope.countryCode, status: "PENDING_FINAL_APPROVAL", page: 1, pageSize: QUEUE_PAGE_SIZE }, context).then((response) =>
            response.items.map(
              (row): ApprovalQueueRow => ({
                resourceType: "payout",
                id: row.id,
                reference: row.code ?? row.id.slice(0, 8),
                amount: row.totalAmount,
                currencyCode: row.currencyCode,
                requester: null,
                date: row.createdAt,
                stage: row.status,
                href: `/payouts/${row.id}`,
              }),
            ),
          ),
        )
      : Promise.resolve(EMPTY_SECTION),
    canListPaymentMethods
      ? settle(
          listPaymentMethods({ organizationId: scope.organizationId, status: "PENDING_VERIFICATION", page: 1, pageSize: QUEUE_PAGE_SIZE }, context).then((response) =>
            response.items.map(
              (item): ApprovalQueueRow => ({
                resourceType: "paymentMethod",
                id: item.id,
                reference: item.displayLabel,
                amount: null,
                currencyCode: null,
                requester: item.createdByActorId,
                date: item.createdAt,
                stage: item.status,
                href: `/payment-methods/${item.id}`,
              }),
            ),
          ),
        )
      : Promise.resolve(EMPTY_SECTION),
    canListInvoices
      ? settle(
          listInvoiceDocuments({ organizationId: scope.organizationId, countryCode: scope.countryCode, status: "SUBMITTED", page: 1, pageSize: QUEUE_PAGE_SIZE }, context).then((response) =>
            response.items.map(
              (row): ApprovalQueueRow => ({
                resourceType: "invoice",
                id: row.id,
                reference: row.documentNumber,
                amount: row.netAmount,
                currencyCode: row.currency,
                requester: null,
                date: row.createdAt,
                stage: row.status,
                href: `/documents/${row.id}`,
              }),
            ),
          ),
        )
      : Promise.resolve(EMPTY_SECTION),
  ]);

  return { payoutFirstApprove, payoutFinalApprove, paymentMethodsPending, invoicesPending };
}
