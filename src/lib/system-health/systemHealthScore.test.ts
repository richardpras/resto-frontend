import { describe, expect, it } from "vitest";
import {
  bugReportsToScore,
  computeSystemHealthScore,
  scoreToSystemHealthSeverity,
} from "./systemHealthScore";

describe("systemHealthScore", () => {
  it("computes weighted score from all modules", () => {
    const result = computeSystemHealthScore({
      accountingScore: 100,
      paymentScore: 100,
      failedJobsScore: 100,
      bugReportsScore: 100,
      criticalNotificationsScore: 100,
      inventoryAlertsScore: 100,
      menuAlertsScore: 100,
    });
    expect(result.score).toBe(100);
    expect(result.severity).toBe("healthy");
    expect(result.partial).toBe(false);
  });

  it("marks partial when not all modules available", () => {
    const result = computeSystemHealthScore({
      failedJobsScore: 100,
      bugReportsScore: 100,
    });
    expect(result.partial).toBe(true);
    expect(result.score).toBe(100);
  });

  it("maps severity bands", () => {
    expect(scoreToSystemHealthSeverity(90)).toBe("healthy");
    expect(scoreToSystemHealthSeverity(75)).toBe("warning");
    expect(scoreToSystemHealthSeverity(55)).toBe("degraded");
    expect(scoreToSystemHealthSeverity(40)).toBe("critical");
  });

  it("scores critical bugs lower", () => {
    expect(bugReportsToScore(0, 2)).toBe(25);
    expect(bugReportsToScore(3, 0)).toBe(75);
    expect(bugReportsToScore(0, 0)).toBe(100);
  });
});
