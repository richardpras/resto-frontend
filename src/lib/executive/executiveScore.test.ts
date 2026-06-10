import { describe, expect, it } from "vitest";
import {
  computeExecutiveScore,
  criticalAlertCountToScore,
  severityToScore,
} from "./executiveScore";

describe("executiveScore", () => {
  it("maps severity to score", () => {
    expect(severityToScore("healthy")).toBe(100);
    expect(severityToScore("warning")).toBe(75);
    expect(severityToScore("critical")).toBe(25);
  });

  it("computes weighted score with partial pillars", () => {
    const result = computeExecutiveScore({
      financial: 80,
      operations: 75,
    });
    expect(result.partial).toBe(true);
    expect(result.pillarCount).toBe(2);
    expect(result.score).toBeGreaterThan(0);
  });

  it("maps critical alert count to score", () => {
    expect(criticalAlertCountToScore(0)).toBe(100);
    expect(criticalAlertCountToScore(4)).toBe(50);
  });
});
