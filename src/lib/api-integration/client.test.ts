import { describe, it, expect, vi, afterEach } from "vitest";
import { apiRequest, ApiHttpError, API_BASE_URL, setApiAccessToken } from "./client";
import { mapOutletDtoToViewModel, parseOutletListPayload } from "@/domain/outletAdapters";
import { normalizeApiError } from "@/domain/apiErrorNormalizer";
import { listOutlets } from "./settingsDomainEndpoints";

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

describe("outlet adapter", () => {
  it("maps outlet api dto to settings outlet view model", () => {
    const dto = {
      id: 1,
      code: "JKT-01",
      name: "Jakarta Central",
      address: "Jl. Sudirman 1",
      phone: "08123456789",
      manager: "Ari",
      status: "active",
      logo: "logo.png",
      invoice_prefix: "INV-JKT",
      order_prefix: "ORD-JKT",
    };

    const result = mapOutletDtoToViewModel(dto);

    expect(result).toEqual({
      id: 1,
      code: "JKT-01",
      name: "Jakarta Central",
      address: "Jl. Sudirman 1",
      phone: "08123456789",
      manager: "Ari",
      status: "active",
      logo: "logo.png",
      invoicePrefix: "INV-JKT",
      orderPrefix: "ORD-JKT",
    });
  });

  it("parses paginated outlet payload data into outlet view models", () => {
    const payload = {
      data: {
        data: [
          {
            id: 2,
            code: "SBY-01",
            name: "Surabaya East",
            address: null,
            phone: null,
            manager: null,
            status: "inactive",
            invoice_prefix: null,
            order_prefix: "ORD-SBY",
          },
        ],
      },
    };

    const result = parseOutletListPayload(payload);

    expect(result).toEqual([
      {
        id: 2,
        code: "SBY-01",
        name: "Surabaya East",
        address: "",
        phone: "",
        manager: "",
        status: "inactive",
        logo: undefined,
        invoicePrefix: undefined,
        orderPrefix: "ORD-SBY",
      },
    ]);
  });
});

describe("api error normalizer", () => {
  it("normalizes ApiHttpError into reusable frontend shape", () => {
    const apiError = new ApiHttpError(422, "Validation failed", {
      message: "Validation failed",
      errors: {
        code: ["The code has already been taken."],
      },
    });

    expect(normalizeApiError(apiError)).toEqual({
      statusCode: 422,
      message: "Validation failed",
      fieldErrors: {
        code: ["The code has already been taken."],
      },
      isAuthError: false,
    });
  });
});

describe("settings domain endpoint parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("listOutlets parses snake_case api rows through adapter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            data: [
              {
                id: 7,
                code: "BDG-01",
                name: "Bandung",
                address: "Jl. Braga",
                phone: "0800",
                manager: "Nina",
                status: "active",
                invoice_prefix: "INV-BDG",
                order_prefix: "ORD-BDG",
              },
            ],
          },
        }),
      }),
    );

    await expect(listOutlets()).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        invoicePrefix: "INV-BDG",
        orderPrefix: "ORD-BDG",
      }),
    ]);
  });
});
