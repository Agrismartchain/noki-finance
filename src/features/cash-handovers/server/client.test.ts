import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listHandovers, getHandover, createHandover, submitHandover, cancelHandover, rejectHandover, receiveHandover } = await import("./client");

describe("cash-handovers server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listHandovers calls GET with the required organizationId/countryCode query params", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0 }, response: { ok: true, status: 200 } });

    await listHandovers({ organizationId: "org-1", countryCode: "MA" }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/handovers", { params: { query: { organizationId: "org-1", countryCode: "MA" } } });
  });

  it("getHandover calls GET with the id path param", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "h-1" }, response: { ok: true, status: 200 } });
    await getHandover("h-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/handovers/{id}", { params: { path: { id: "h-1" } } });
  });

  it("createHandover sends the Idempotency-Key as a typed header param, not a free-form header", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "h-1" }, response: { ok: true, status: 201 } });

    await createHandover({ organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", items: [] }, "idem-key-1", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/cash/handovers", {
      params: { header: { "Idempotency-Key": "idem-key-1" } },
      body: { organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", items: [] },
    });
  });

  it("submitHandover, cancelHandover, rejectHandover, and receiveHandover all pass the Idempotency-Key header", async () => {
    postMock.mockResolvedValue({ data: { id: "h-1" }, response: { ok: true, status: 200 } });

    await submitHandover("h-1", "key-submit", {});
    await cancelHandover("h-1", { reason: "test" }, "key-cancel", {});
    await rejectHandover("h-1", { reason: "test" }, "key-reject", {});
    await receiveHandover("h-1", { cashSessionId: "s-1", items: [] }, "key-receive", {});

    expect(postMock).toHaveBeenNthCalledWith(1, "/v1/finance/cash/handovers/{id}/submit", { params: { path: { id: "h-1" }, header: { "Idempotency-Key": "key-submit" } } });
    expect(postMock).toHaveBeenNthCalledWith(2, "/v1/finance/cash/handovers/{id}/cancel", {
      params: { path: { id: "h-1" }, header: { "Idempotency-Key": "key-cancel" } },
      body: { reason: "test" },
    });
    expect(postMock).toHaveBeenNthCalledWith(3, "/v1/finance/cash/handovers/{id}/reject", {
      params: { path: { id: "h-1" }, header: { "Idempotency-Key": "key-reject" } },
      body: { reason: "test" },
    });
    expect(postMock).toHaveBeenNthCalledWith(4, "/v1/finance/cash/handovers/{id}/receive", {
      params: { path: { id: "h-1" }, header: { "Idempotency-Key": "key-receive" } },
      body: { cashSessionId: "s-1", items: [] },
    });
  });

  it("maps a 409 conflict response (e.g. reused idempotency key with a different body) into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(createHandover({ organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", items: [] }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });
});
