import { describe, expect, it } from "vitest";
import { hasAssignedSplitId } from "./splitIdUtils";

describe("hasAssignedSplitId", () => {
  it("accepts positive server ids and negative offline local ids", () => {
    expect(hasAssignedSplitId(12)).toBe(true);
    expect(hasAssignedSplitId(-1)).toBe(true);
    expect(hasAssignedSplitId(-3)).toBe(true);
  });

  it("rejects missing or zero", () => {
    expect(hasAssignedSplitId(undefined)).toBe(false);
    expect(hasAssignedSplitId(null)).toBe(false);
    expect(hasAssignedSplitId(0)).toBe(false);
  });
});
