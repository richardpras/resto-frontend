import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListMembers = vi.fn();

vi.mock("@/lib/api-integration/membersEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/membersEndpoints")>(
    "@/lib/api-integration/membersEndpoints",
  );
  return {
    ...actual,
    listMembers: (...args: unknown[]) => mockListMembers(...args),
  };
});

import { useMemberStore } from "./memberStore";

describe("memberStore perf guards", () => {
  beforeEach(() => {
    mockListMembers.mockReset();
    useMemberStore.setState({
      members: [],
      loading: false,
      lastFetchedAt: 0,
      inFlightFetch: null,
    });
  });

  it("dedupes concurrent fetchMembers calls", async () => {
    let resolveFetch: ((value: unknown[]) => void) | null = null;
    mockListMembers.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve as (value: unknown[]) => void;
        }),
    );
    const first = useMemberStore.getState().fetchMembers();
    const second = useMemberStore.getState().fetchMembers();
    resolveFetch?.([]);
    await Promise.all([first, second]);
    expect(mockListMembers).toHaveBeenCalledTimes(1);
  });
});

