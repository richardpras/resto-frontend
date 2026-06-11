import { describe, expect, it } from "vitest";
import {
  formatKdsOrderAge,
  kdsUrgencyFromMinutes,
  sanitizeElapsedMinutes,
} from "./kdsUrgency";

describe("KdsUrgency", () => {
  it("classifies 0-4 min as normal, 5-9 as warning, 10+ as critical", () => {
    expect(kdsUrgencyFromMinutes(0)).toBe("normal");
    expect(kdsUrgencyFromMinutes(4)).toBe("normal");
    expect(kdsUrgencyFromMinutes(5)).toBe("warning");
    expect(kdsUrgencyFromMinutes(9)).toBe("warning");
    expect(kdsUrgencyFromMinutes(10)).toBe("critical");
    expect(kdsUrgencyFromMinutes(42)).toBe("critical");
  });

  it("formats order age for kitchen screens", () => {
    expect(formatKdsOrderAge(0)).toBe("<1 min");
    expect(formatKdsOrderAge(1)).toBe("1 min");
    expect(formatKdsOrderAge(7)).toBe("7 min");
    expect(formatKdsOrderAge(15)).toBe("15 min");
  });

  it("rejects absurd elapsed values", () => {
    expect(sanitizeElapsedMinutes(42033)).toBeNull();
    expect(sanitizeElapsedMinutes(-5)).toBeNull();
    expect(formatKdsOrderAge(42033)).toBe("--");
  });
});
