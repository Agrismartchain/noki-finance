import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listSessions, getSession, openSession, closeSession } = await import("./client");

describe("cash-sessions server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listSessions calls GET with the required organizationId/countryCode", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0 }, response: { ok: true, status: 200 } });
    await listSessions({ organizationId: "org-1", countryCode: "MA" }, {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/sessions", { params: { query: { organizationId: "org-1", countryCode: "MA" } } });
  });

  it("openSession sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "s-1" }, response: { ok: true, status: 201 } });
    await openSession({ organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", openingAmount: "0.00" }, "key-1", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/cash/sessions", {
      params: { header: { "Idempotency-Key": "key-1" } },
      body: { organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", openingAmount: "0.00" },
    });
  });

  it("closeSession sends ONLY countedClosingAmount in the body -- never an expected amount", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "s-1" }, response: { ok: true, status: 200 } });
    await closeSession("s-1", { countedClosingAmount: "95.00" }, "key-close", {});
    expect(postMock).toHaveBeenCalledWith("/v1/finance/cash/sessions/{id}/close", {
      params: { path: { id: "s-1" }, header: { "Idempotency-Key": "key-close" } },
      body: { countedClosingAmount: "95.00" },
    });
  });

  it("getSession calls GET with the id path param", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "s-1" }, response: { ok: true, status: 200 } });
    await getSession("s-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/cash/sessions/{id}", { params: { path: { id: "s-1" } } });
  });
});
