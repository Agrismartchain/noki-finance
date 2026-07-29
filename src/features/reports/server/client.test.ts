import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { getReport, exportReport } = await import("./client");

describe("reports server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getReport calls GET with the reportType path param and query filters", async () => {
    getMock.mockResolvedValueOnce({
      data: { reportType: "payouts", items: [], total: 0, page: 1, pageSize: 25, appliedFilters: {}, generatedAt: "2026-07-28T00:00:00.000Z" },
      response: { ok: true, status: 200 },
    });

    await getReport("payouts", { organizationId: "org-1", status: "PAID", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/reports/{reportType}", {
      params: { path: { reportType: "payouts" }, query: { organizationId: "org-1", status: "PAID", page: 1, pageSize: 25 } },
    });
  });

  it("getReport returns the unwrapped list response", async () => {
    const data = { reportType: "cod", items: [{ id: "row-1" }], total: 1, page: 1, pageSize: 25, appliedFilters: {}, generatedAt: "2026-07-28T00:00:00.000Z" };
    getMock.mockResolvedValueOnce({ data, response: { ok: true, status: 200 } });

    const result = await getReport("cod", {}, {});
    expect(result).toEqual(data);
  });

  it("exportReport sends the CSV format and no Idempotency-Key header", async () => {
    postMock.mockResolvedValueOnce({
      data: { reportType: "payouts", format: "CSV", mimeType: "text/csv; charset=utf-8", filename: "finance-payouts-2026-07-28.csv", checksum: "abc123", rowCount: 2, maxRows: 1000, content: "a,b\n1,2\n", appliedFilters: {} },
      response: { ok: true, status: 201 },
    });

    await exportReport("payouts", { organizationId: "org-1", status: "PAID" }, {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/reports/{reportType}/exports", {
      params: { path: { reportType: "payouts" } },
      body: { organizationId: "org-1", status: "PAID", format: "CSV" },
    });
  });

  it("exportReport returns the verbatim CSV content from the response", async () => {
    const data = { reportType: "cod", format: "CSV", mimeType: "text/csv; charset=utf-8", filename: "finance-cod-2026-07-28.csv", checksum: "def456", rowCount: 1, maxRows: 1000, content: "id\nrow-1\n", appliedFilters: {} };
    postMock.mockResolvedValueOnce({ data, response: { ok: true, status: 201 } });

    const result = await exportReport("cod", {}, {});
    expect(result.content).toBe("id\nrow-1\n");
    expect(result).toEqual(data);
  });

  it("maps a 400 unsupported report type response into a bad_request NokiApiError", async () => {
    getMock.mockResolvedValueOnce({ error: { statusCode: 400, code: "UNSUPPORTED_REPORT_TYPE", message: "Unsupported Finance report type" }, response: { ok: false, status: 400 } });

    await expect(getReport("cod" as never, {}, {})).rejects.toMatchObject({ kind: "bad_request" } satisfies Partial<NokiApiError>);
  });

  it("maps a 403 forbidden export response into a forbidden NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 403, code: "FORBIDDEN" }, response: { ok: false, status: 403 } });

    await expect(exportReport("payouts", {}, {})).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<NokiApiError>);
  });
});
