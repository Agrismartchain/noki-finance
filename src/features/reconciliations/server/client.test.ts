import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listReconciliations, getReconciliation, createReconciliation, submitReconciliation, approveReconciliation } = await import("./client");

describe("reconciliations server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listReconciliations calls GET with the required organizationId/countryCode", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0 }, response: { ok: true, status: 200 } });
    await listReconciliations({ organizationId: "org-1", countryCode: "MA" }, {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/reconciliations", { params: { query: { organizationId: "org-1", countryCode: "MA" } } });
  });

  it("getReconciliation calls GET with the id path param", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "r-1" }, response: { ok: true, status: 200 } });
    await getReconciliation("r-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/reconciliations/{id}", { params: { path: { id: "r-1" } } });
  });

  it("createReconciliation sends cashSessionId with the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "r-1" }, response: { ok: true, status: 201 } });
    await createReconciliation({ cashSessionId: "s-1" }, "key-1", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/reconciliations", { params: { header: { "Idempotency-Key": "key-1" } }, body: { cashSessionId: "s-1" } });
  });

  it("submitReconciliation and approveReconciliation both pass the Idempotency-Key header and take no body", async () => {
    postMock.mockResolvedValue({ data: { id: "r-1" }, response: { ok: true, status: 200 } });

    await submitReconciliation("r-1", "key-submit", {});
    await approveReconciliation("r-1", "key-approve", {});

    expect(postMock).toHaveBeenNthCalledWith(1, "/v1/finance/reconciliations/{id}/submit", { params: { path: { id: "r-1" }, header: { "Idempotency-Key": "key-submit" } } });
    expect(postMock).toHaveBeenNthCalledWith(2, "/v1/finance/reconciliations/{id}/approve", { params: { path: { id: "r-1" }, header: { "Idempotency-Key": "key-approve" } } });
  });
});
