import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listVariances, getVariance, resolveVariance } = await import("./client");

describe("cash-variances server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listVariances calls GET with the required organizationId/countryCode", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0 }, response: { ok: true, status: 200 } });
    await listVariances({ organizationId: "org-1", countryCode: "MA" }, {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/variances", { params: { query: { organizationId: "org-1", countryCode: "MA" } } });
  });

  it("getVariance calls GET with the id path param", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "v-1" }, response: { ok: true, status: 200 } });
    await getVariance("v-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/variances/{id}", { params: { path: { id: "v-1" } } });
  });

  it("resolveVariance sends the decision and reason, with the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "v-1" }, response: { ok: true, status: 200 } });
    await resolveVariance("v-1", { resolutionStatus: "RESOLVED", reason: "Confirmed with cashier" }, "key-1", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/cash/variances/{id}/resolve", {
      params: { path: { id: "v-1" }, header: { "Idempotency-Key": "key-1" } },
      body: { resolutionStatus: "RESOLVED", reason: "Confirmed with cashier" },
    });
  });
});
