import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const {
  listPayouts,
  getPayout,
  proposePayout,
  createPayoutHold,
  releasePayoutHold,
  firstApprovePayout,
  finalApprovePayout,
  exportPayout,
  markPayoutSent,
  markPayoutPaid,
  markPayoutFailed,
  retryPayout,
  cancelPayout,
  reconcilePayout,
} = await import("./client");

describe("payouts server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPayouts calls GET the reports endpoint with reportType=payouts and the query params", async () => {
    getMock.mockResolvedValueOnce({ data: { reportType: "payouts", items: [], total: 0, page: 1, pageSize: 25, appliedFilters: {}, generatedAt: "2026-01-01T00:00:00Z" }, response: { ok: true, status: 200 } });

    await listPayouts({ organizationId: "org-1", status: "SENT", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/reports/{reportType}", {
      params: { path: { reportType: "payouts" }, query: { organizationId: "org-1", status: "SENT", page: 1, pageSize: 25 } },
    });
  });

  it("getPayout calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "p-1", status: "DRAFT" }, response: { ok: true, status: 200 } });
    const payout = await getPayout("p-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}", { params: { path: { id: "p-1" } } });
    expect(payout).toEqual({ id: "p-1", status: "DRAFT" });
  });

  it("proposePayout sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });

    await proposePayout(
      {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        counterpartyType: "DRIVER",
        counterpartyId: "driver-1",
        paymentMethodId: "pm-1",
        obligationIds: ["ob-1", "ob-2"],
      },
      "idem-1",
      {},
    );

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body: {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        counterpartyType: "DRIVER",
        counterpartyId: "driver-1",
        paymentMethodId: "pm-1",
        obligationIds: ["ob-1", "ob-2"],
      },
    });
  });

  it("createPayoutHold sends the Idempotency-Key as a typed header param with the id path param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });

    await createPayoutHold("p-1", { type: "DISPUTE", reason: "under review" }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/holds", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-2" } },
      body: { type: "DISPUTE", reason: "under review" },
    });
  });

  it("releasePayoutHold sends both the id and holdId path params", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });

    await releasePayoutHold("p-1", "hold-1", { reason: "resolved" }, "idem-3", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/holds/{holdId}/release", {
      params: { path: { id: "p-1", holdId: "hold-1" }, header: { "Idempotency-Key": "idem-3" } },
      body: { reason: "resolved" },
    });
  });

  it("firstApprovePayout posts to first-approve with an optional reason", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await firstApprovePayout("p-1", { reason: "ok" }, "idem-4", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/first-approve", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-4" } },
      body: { reason: "ok" },
    });
  });

  it("finalApprovePayout posts to final-approve", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await finalApprovePayout("p-1", {}, "idem-5", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/final-approve", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-5" } },
      body: {},
    });
  });

  it("exportPayout posts to export", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await exportPayout("p-1", { exportReference: "exp-1" }, "idem-6", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/export", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-6" } },
      body: { exportReference: "exp-1" },
    });
  });

  it("markPayoutSent posts to sent", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await markPayoutSent("p-1", { externalReference: "ext-1" }, "idem-7", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/sent", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-7" } },
      body: { externalReference: "ext-1" },
    });
  });

  it("markPayoutPaid posts to paid with a required proofReference and never an amount field", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await markPayoutPaid("p-1", { proofReference: "proof-1" }, "idem-8", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/paid", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-8" } },
      body: { proofReference: "proof-1" },
    });
  });

  it("markPayoutFailed posts to failed with required errorCode and reason", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await markPayoutFailed("p-1", { errorCode: "E1", reason: "bank rejected" }, "idem-9", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/failed", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-9" } },
      body: { errorCode: "E1", reason: "bank rejected" },
    });
  });

  it("retryPayout posts to retry", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await retryPayout("p-1", { reason: "retry after fix" }, "idem-10", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/retry", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-10" } },
      body: { reason: "retry after fix" },
    });
  });

  it("cancelPayout posts to cancel", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await cancelPayout("p-1", { reason: "duplicate" }, "idem-11", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/cancel", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-11" } },
      body: { reason: "duplicate" },
    });
  });

  it("reconcilePayout posts to reconcile", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "p-1" }, response: { ok: true, status: 201 } });
    await reconcilePayout("p-1", { reconciliationReference: "rec-1" }, "idem-12", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/payouts/{id}/reconcile", {
      params: { path: { id: "p-1" }, header: { "Idempotency-Key": "idem-12" } },
      body: { reconciliationReference: "rec-1" },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(cancelPayout("p-1", { reason: "x" }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });
});
