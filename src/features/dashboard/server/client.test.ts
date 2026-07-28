import { describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock }, correlationId: "corr-1" }),
}));

const { getDashboard, getDashboardAging, getDashboardCashflow } = await import("./client");

describe("dashboard server client", () => {
  it("getDashboard calls GET /v1/finance/dashboard with the given query", async () => {
    getMock.mockResolvedValueOnce({ data: { projection: "finance_dashboard", generatedAt: "now", appliedFilters: {}, metrics: [] }, response: { ok: true, status: 200 } });

    const result = await getDashboard({ organizationId: "org-1" }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/dashboard", { params: { query: { organizationId: "org-1" } } });
    expect(result.metrics).toEqual([]);
  });

  it("getDashboardAging calls GET /v1/finance/dashboard/aging", async () => {
    getMock.mockResolvedValueOnce({ data: { projection: "finance_aging", referenceDate: "now", appliedFilters: {}, sections: [] }, response: { ok: true, status: 200 } });

    await getDashboardAging({}, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/dashboard/aging", { params: { query: {} } });
  });

  it("getDashboardCashflow calls GET /v1/finance/dashboard/cashflow", async () => {
    getMock.mockResolvedValueOnce({
      data: { projection: "operational_cashflow", generatedAt: "now", period: "range", appliedFilters: {}, periods: [] },
      response: { ok: true, status: 200 },
    });

    await getDashboardCashflow({}, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/dashboard/cashflow", { params: { query: {} } });
  });

  it("maps a 403 response into a forbidden NokiApiError", async () => {
    getMock.mockResolvedValueOnce({ error: { statusCode: 403, code: "FORBIDDEN" }, response: { ok: false, status: 403 } });

    await expect(getDashboard({}, {})).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<NokiApiError>);
  });

  it("maps a 500 response into a server_error NokiApiError", async () => {
    getMock.mockResolvedValueOnce({ error: { statusCode: 500 }, response: { ok: false, status: 500 } });

    await expect(getDashboard({}, {})).rejects.toMatchObject({ kind: "server_error" } satisfies Partial<NokiApiError>);
  });
});
