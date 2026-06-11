import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiHttpError, setApiAccessToken, setUnauthorizedHandler } from "./client";

describe("ApiUnauthorizedLogout", () => {
  afterEach(() => {
    setApiAccessToken(undefined);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("invokes unauthorized handler when refresh fails on 401", async () => {
    const logout = vi.fn();
    setUnauthorizedHandler(logout);
    setApiAccessToken("expired-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthenticated." }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthenticated." }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/auth/me")).rejects.toBeInstanceOf(ApiHttpError);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
