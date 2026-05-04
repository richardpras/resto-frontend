import { describe, it, expect, vi, afterEach } from "vitest";
import { apiRequest, ApiHttpError, API_BASE_URL, setApiAccessToken } from "./client";

describe("api-integration client", () => {
  afterEach(() => {
    setApiAccessToken(undefined);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends Authorization Bearer when setApiAccessToken is set", async () => {
    setApiAccessToken("test-token-xyz");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/protected");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/protected`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-xyz",
        }),
      }),
    );
  });

  it("returns parsed JSON when response is ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ data: { id: string } }>("/demo");

    expect(result.data.id).toBe("1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/demo`,
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws ApiHttpError with status and Laravel-style message when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: "Invalid payload" }),
      }),
    );

    await expect(apiRequest("/bad")).rejects.toBeInstanceOf(ApiHttpError);

    try {
      await apiRequest("/bad");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiHttpError);
      const err = e as ApiHttpError;
      expect(err.status).toBe(422);
      expect(err.message).toBe("Invalid payload");
      expect(err.body).toEqual({ message: "Invalid payload" });
    }
  });

  it("uses generic failure message when body has no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(apiRequest("/x")).rejects.toMatchObject({
      message: "Request failed (500)",
      status: 500,
    });
  });
});
