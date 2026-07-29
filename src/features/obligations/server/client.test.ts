import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listObligations, getObligation, createObligation, allocateObligation } = await import("./client");

describe("obligations server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listObligations calls GET with the query params", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 25 }, response: { ok: true, status: 200 } });

    await listObligations({ organizationId: "org-1", status: "OPEN", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/obligations", { params: { query: { organizationId: "org-1", status: "OPEN", page: 1, pageSize: 25 } } });
  });

  it("getObligation calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "o-1", status: "OPEN" }, response: { ok: true, status: 200 } });
    const obligation = await getObligation("o-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/obligations/{id}", { params: { path: { id: "o-1" } } });
    expect(obligation).toEqual({ id: "o-1", status: "OPEN" });
  });

  it("createObligation sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "o-1" }, response: { ok: true, status: 201 } });

    await createObligation(
      {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        sourceDomain: "COMMERCE",
        sourceReferenceType: "Order",
        sourceReferenceId: "ord-1",
        counterpartyType: "SELLER",
        counterpartyId: "seller-1",
        nature: "COMMISSION",
        direction: "RECEIVABLE",
        originalAmount: "100.00",
      },
      "idem-1",
      {},
    );

    expect(postMock).toHaveBeenCalledWith("/v1/finance/obligations", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body: {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        sourceDomain: "COMMERCE",
        sourceReferenceType: "Order",
        sourceReferenceId: "ord-1",
        counterpartyType: "SELLER",
        counterpartyId: "seller-1",
        nature: "COMMISSION",
        direction: "RECEIVABLE",
        originalAmount: "100.00",
      },
    });
  });

  it("allocateObligation sends the Idempotency-Key as a typed header param with the id path param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "o-1" }, response: { ok: true, status: 201 } });

    await allocateObligation("o-1", { allocationType: "PAYOUT", allocationReferenceId: "payout-1", amount: "50.00" }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/obligations/{id}/allocations", {
      params: { path: { id: "o-1" }, header: { "Idempotency-Key": "idem-2" } },
      body: { allocationType: "PAYOUT", allocationReferenceId: "payout-1", amount: "50.00" },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(allocateObligation("o-1", { allocationType: "PAYOUT", allocationReferenceId: "p-1", amount: "10.00" }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });
});
