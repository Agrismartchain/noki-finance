import { beforeEach, describe, expect, it, vi } from "vitest";

import { NokiApiError } from "@/lib/api/errors";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createServerNokiClient: () => ({ client: { GET: getMock, POST: postMock }, correlationId: "corr-1" }),
}));

const { getDispute, createDispute, resolveDispute } = await import("./client");

describe("disputes server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDispute calls GET with the id path param and returns the flat detail object", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "d-1", status: "OPEN" }, response: { ok: true, status: 200 } });

    const dispute = await getDispute("d-1", {});

    expect(getMock).toHaveBeenCalledWith("/v1/finance/disputes/{id}", { params: { path: { id: "d-1" } } });
    expect(dispute).toEqual({ id: "d-1", status: "OPEN" });
  });

  it("createDispute sends the Idempotency-Key as a typed header param and no scope fields", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "d-1" }, response: { ok: true, status: 201 } });

    await createDispute({ obligationId: "o-1", reasonCode: "QUALITY", reason: "Item damaged in transit." }, "idem-1", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/disputes", {
      params: { header: { "Idempotency-Key": "idem-1" } },
      body: { obligationId: "o-1", reasonCode: "QUALITY", reason: "Item damaged in transit." },
    });
  });

  it("resolveDispute sends the Idempotency-Key as a typed header param with the id path param", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "d-1", status: "RESOLVED" }, response: { ok: true, status: 200 } });

    await resolveDispute("d-1", { resolution: "RELEASE", reason: "Investigation closed, no fault found." }, "idem-2", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/disputes/{id}/resolve", {
      params: { path: { id: "d-1" }, header: { "Idempotency-Key": "idem-2" } },
      body: { resolution: "RELEASE", reason: "Investigation closed, no fault found." },
    });
  });

  it("resolveDispute forwards an adjustmentId when resolution is ADJUSTMENT", async () => {
    postMock.mockResolvedValueOnce({ data: { id: "d-1", status: "RESOLVED" }, response: { ok: true, status: 200 } });

    await resolveDispute("d-1", { resolution: "ADJUSTMENT", reason: "Applying a compensating adjustment.", adjustmentId: "adj-1" }, "idem-3", {});

    expect(postMock).toHaveBeenCalledWith("/v1/finance/disputes/{id}/resolve", {
      params: { path: { id: "d-1" }, header: { "Idempotency-Key": "idem-3" } },
      body: { resolution: "ADJUSTMENT", reason: "Applying a compensating adjustment.", adjustmentId: "adj-1" },
    });
  });

  it("maps a 409 conflict response into a conflict NokiApiError", async () => {
    postMock.mockResolvedValueOnce({ error: { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" }, response: { ok: false, status: 409 } });

    await expect(resolveDispute("d-1", { resolution: "RELEASE", reason: "Retrying the same resolution." }, "key-1", {})).rejects.toMatchObject({
      kind: "conflict",
    } satisfies Partial<NokiApiError>);
  });

  it("maps a 404 not-found response into a bad_request-adjacent NokiApiError kind derived from status", async () => {
    getMock.mockResolvedValueOnce({ error: { statusCode: 404, code: "NOT_FOUND" }, response: { ok: false, status: 404 } });

    await expect(getDispute("missing-id", {})).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<NokiApiError>);
  });
});
