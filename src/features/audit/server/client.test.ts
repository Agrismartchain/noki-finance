import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock }, correlationId: "corr-1" }),
}));

const { searchAudit } = await import("./client");

describe("audit server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchAudit calls GET with the query params", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 25 }, response: { ok: true, status: 200 } });

    await searchAudit({ organizationId: "org-1", resourceType: "FinancialObligation", page: 1, pageSize: 25 }, {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/audit", { params: { query: { organizationId: "org-1", resourceType: "FinancialObligation", page: 1, pageSize: 25 } } });
  });

  it("narrows Record<string, never>-typed optional fields to string | null defensively", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [
          { id: "a-1", actorId: "actor-1", membershipId: {}, organizationId: "org-1", countryId: {}, action: "finance.obligation.allocate", resourceType: "FinancialObligation", resourceId: "o-1", correlationId: {}, metadata: { key: "value" }, occurredAt: "2026-07-28T00:00:00.000Z" },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      },
      response: { ok: true, status: 200 },
    });

    const result = await searchAudit({}, {});
    expect(result.items[0]).toEqual({
      id: "a-1",
      actorId: "actor-1",
      membershipId: null,
      organizationId: "org-1",
      countryId: null,
      action: "finance.obligation.allocate",
      resourceType: "FinancialObligation",
      resourceId: "o-1",
      correlationId: null,
      metadata: { key: "value" },
      occurredAt: "2026-07-28T00:00:00.000Z",
    });
  });

  it("normalizes a null metadata to null rather than an empty object", async () => {
    getMock.mockResolvedValueOnce({
      data: { items: [{ id: "a-1", action: "finance.obligation.allocate", resourceType: "FinancialObligation", occurredAt: "2026-07-28T00:00:00.000Z", metadata: null }], total: 1, page: 1, pageSize: 25 },
      response: { ok: true, status: 200 },
    });

    const result = await searchAudit({}, {});
    expect(result.items[0]?.metadata).toBeNull();
  });

  it("maps a 403 forbidden response into a forbidden NokiApiError", async () => {
    getMock.mockResolvedValueOnce({ error: { statusCode: 403, code: "FORBIDDEN" }, response: { ok: false, status: 403 } });

    await expect(searchAudit({}, {})).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<NokiApiError>);
  });
});
