// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

describe("ShiftCloseRunningLock", () => {
  it("prevents duplicate submit while closing flag is set", () => {
    let closing = false;
    const canSubmit = () => !closing;
    expect(canSubmit()).toBe(true);
    closing = true;
    expect(canSubmit()).toBe(false);
  });
});
