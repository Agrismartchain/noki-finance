import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { listInvoiceDocuments, getDocument, createDocument, approveDocument, voidDocument } = await import("./client");

describe("documents server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listInvoiceDocuments calls GET on the invoices report with the query params", async () => {
    getMock.mockResolvedValueOnce({ data: { reportType: "invoices", items: [], total: 0, page: 1, pageSize: 25, appliedFilters: {}, generatedAt: "2026-01-01T00:00:00.000Z" }, response: { ok: true, status: 200 } });

    await listInvoiceDocuments({ organizationId: "org-1", countryCode: "MA", status: "APPROVED", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/reports/{reportType}", {
      params: { path: { reportType: "invoices" }, query: { organizationId: "org-1", countryCode: "MA", status: "APPROVED", page: 1, pageSize: 25 } },
    });
  });

  it("getDocument calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "doc-1", status: "GENERATED" }, response: { ok: true, status: 200 } });
    const document = await getDocument("doc-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/documents/{id}", { params: { path: { id: "doc-1" } } });
    expect(document).toEqual({ id: "doc-1", status: "GENERATED" });
  });

  it("createDocument sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "doc-1" }, response: { ok: true, status: 201 } });

    await createDocument(
      {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        documentType: "INVOICE",
        counterpartyType: "SELLER",
        counterpartyId: "seller-1",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
      "idem-1",
      {},
    );

    expect(postMock).toHaveBeenCalledWith("/v1/finance/documents", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body: {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        documentType: "INVOICE",
        counterpartyType: "SELLER",
        counterpartyId: "seller-1",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    });
  });

  it("approveDocument sends the Idempotency-Key as a typed header param with the id path param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "doc-1" }, response: { ok: true, status: 200 } });

    await approveDocument("doc-1", { reason: "ok" }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/documents/{id}/approve", {
      params: { path: { id: "doc-1" }, header: { "Idempotency-Key": "idem-2" } },
      body: { reason: "ok" },
    });
  });

  it("voidDocument sends the required reason and Idempotency-Key", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "doc-1" }, response: { ok: true, status: 200 } });

    await voidDocument("doc-1", { reason: "duplicate document" }, "idem-3", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/documents/{id}/void", {
      params: { path: { id: "doc-1" }, header: { "Idempotency-Key": "idem-3" } },
      body: { reason: "duplicate document" },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(voidDocument("doc-1", { reason: "duplicate document" }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });
});
