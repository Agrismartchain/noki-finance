import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listPaymentMethods, getPaymentMethod, getSensitiveReference, createPaymentMethod, approvePaymentMethod, suspendPaymentMethod, revokePaymentMethod } = await import("./client");

describe("payment-methods server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPaymentMethods calls GET with the query params", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 25 }, response: { ok: true, status: 200 } });

    await listPaymentMethods({ organizationId: "org-1", status: "ACTIVE", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/payment-methods", { params: { query: { organizationId: "org-1", status: "ACTIVE", page: 1, pageSize: 25 } } });
  });

  it("getPaymentMethod calls GET with the id path param and returns the flat detail object, including destinationFingerprint on the raw payload", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "pm-1", status: "ACTIVE", destinationFingerprint: "hash-abc" }, response: { ok: true, status: 200 } });

    const paymentMethod = await getPaymentMethod("pm-1", {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/payment-methods/{id}", { params: { path: { id: "pm-1" } } });
    expect(paymentMethod).toEqual({ id: "pm-1", status: "ACTIVE", destinationFingerprint: "hash-abc" });
  });

  it("getSensitiveReference calls GET on the dedicated sensitive-reference endpoint", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "pm-1", sensitiveReference: "vault:abc123xyz", status: "ACTIVE", version: 2 }, response: { ok: true, status: 200 } });

    const result = await getSensitiveReference("pm-1", {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/payment-methods/{id}/sensitive-reference", { params: { path: { id: "pm-1" } } });
    expect(result).toEqual({ id: "pm-1", sensitiveReference: "vault:abc123xyz", status: "ACTIVE", version: 2 });
  });

  it("createPaymentMethod sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "pm-1" }, response: { ok: true, status: 201 } });

    const body = {
      organizationId: "org-1",
      countryId: "c-1",
      countryCode: "MA",
      currencyId: "cur-1",
      counterpartyType: "SELLER",
      counterpartyId: "seller-1",
      type: "BANK_ACCOUNT" as const,
      providerCode: "CIH",
      displayLabel: "Seller main account",
      destinationMasked: "**** 4242",
      destinationFingerprint: "hash-abc",
      sensitiveReference: "vault:abc123xyz",
    };

    await createPaymentMethod(body, "idem-1", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payment-methods", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body,
    });
  });

  it("approvePaymentMethod sends the Idempotency-Key as a typed header param with the id path param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "pm-1", status: "ACTIVE" }, response: { ok: true, status: 200 } });

    await approvePaymentMethod("pm-1", { reason: "Verified with provider." }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payment-methods/{id}/approve", {
      params: { path: { id: "pm-1" }, header: { "Idempotency-Key": "idem-2" } },
      body: { reason: "Verified with provider." },
    });
  });

  it("suspendPaymentMethod requires and sends a reason", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "pm-1", status: "SUSPENDED" }, response: { ok: true, status: 200 } });

    await suspendPaymentMethod("pm-1", { reason: "Suspicious activity reported." }, "idem-3", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payment-methods/{id}/suspend", {
      params: { path: { id: "pm-1" }, header: { "Idempotency-Key": "idem-3" } },
      body: { reason: "Suspicious activity reported." },
    });
  });

  it("revokePaymentMethod requires and sends a reason", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "pm-1", status: "REVOKED" }, response: { ok: true, status: 200 } });

    await revokePaymentMethod("pm-1", { reason: "Counterparty offboarded." }, "idem-4", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/payment-methods/{id}/revoke", {
      params: { path: { id: "pm-1" }, header: { "Idempotency-Key": "idem-4" } },
      body: { reason: "Counterparty offboarded." },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(suspendPaymentMethod("pm-1", { reason: "Retry of the same suspend." }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });

  it("maps a 422 unprocessable response (e.g. a rejected sensitiveReference format) into an unprocessable NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 422, code: "VALIDATION_FAILED" }, response: { ok: false, status: 422 } });

    await expect(
      createPaymentMethod(
        {
          organizationId: "org-1",
          countryId: "c-1",
          countryCode: "MA",
          currencyId: "cur-1",
          counterpartyType: "SELLER",
          counterpartyId: "seller-1",
          type: "BANK_ACCOUNT",
          providerCode: "CIH",
          displayLabel: "Seller main account",
          destinationMasked: "**** 4242",
          destinationFingerprint: "hash-abc",
          sensitiveReference: "MA64011519000001205000534921",
        },
        "key-2",
        {},
      ),
    ).rejects.toMatchObject({ kind: "unprocessable" } satisfies Partial<NokiApiError>);
  });
});
