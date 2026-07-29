import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { getFeeRule, createFeeRule, listFeeAssessments, getFeeAssessment, createFeeAssessment } = await import("./client");

describe("fees server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getFeeRule calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "fr-1", workflowStatus: "DRAFT" }, response: { ok: true, status: 200 } });
    const feeRule = await getFeeRule("fr-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/fee-rules/{id}", { params: { path: { id: "fr-1" } } });
    expect(feeRule).toEqual({ id: "fr-1", workflowStatus: "DRAFT" });
  });

  it("createFeeRule sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "fr-1" }, response: { ok: true, status: 201 } });

    await createFeeRule(
      {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        type: "CONFIRMATION",
        scopeType: "COUNTRY",
        calculationType: "FIXED",
        fixedAmount: "10.00",
        priority: 0,
      },
      "idem-1",
      {},
    );

    expect(postMock).toHaveBeenCalledWith("/v1/finance/fee-rules", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body: {
        organizationId: "org-1",
        countryId: "c-1",
        countryCode: "MA",
        currencyId: "cur-1",
        type: "CONFIRMATION",
        scopeType: "COUNTRY",
        calculationType: "FIXED",
        fixedAmount: "10.00",
        priority: 0,
      },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError on createFeeRule", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(
      createFeeRule({ organizationId: "org-1", countryId: "c-1", countryCode: "MA", currencyId: "cur-1", type: "CONFIRMATION", scopeType: "COUNTRY", calculationType: "FIXED" }, "idem-1", {}),
    ).rejects.toMatchObject({ kind: "conflict" } satisfies Partial<NokiApiError>);
  });

  it("listFeeAssessments calls GET on the fees report path with the reportType path param and query filters", async () => {
    getMock.mockResolvedValueOnce({ data: { reportType: "fees", items: [], total: 0, page: 1, pageSize: 25, appliedFilters: {}, generatedAt: "2026-01-01T00:00:00.000Z" }, response: { ok: true, status: 200 } });

    await listFeeAssessments({ organizationId: "org-1", countryCode: "MA", status: "ASSESSED", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/reports/{reportType}", {
      params: { path: { reportType: "fees" }, query: { organizationId: "org-1", countryCode: "MA", status: "ASSESSED", page: 1, pageSize: 25 } },
    });
  });

  it("getFeeAssessment calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "fa-1", status: "ASSESSED" }, response: { ok: true, status: 200 } });
    const feeAssessment = await getFeeAssessment("fa-1", {});
    expect(getMock).toHaveBeenCalledWith("/v1/finance/fee-assessments/{id}", { params: { path: { id: "fa-1" } } });
    expect(feeAssessment).toEqual({ id: "fa-1", status: "ASSESSED" });
  });

  it("createFeeAssessment sends the Idempotency-Key as a typed header param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "fa-1" }, response: { ok: true, status: 201 } });

    await createFeeAssessment({ obligationId: "obl-1", type: "CONFIRMATION" }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/fee-assessments", {
      params: { header: { "Idempotency-Key": "idem-2" } },
      body: { obligationId: "obl-1", type: "CONFIRMATION" },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError on createFeeAssessment", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(createFeeAssessment({ obligationId: "obl-1", type: "CONFIRMATION" }, "idem-2", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });
});
