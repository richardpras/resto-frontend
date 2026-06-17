// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  addActiveOrderCode,
  getActiveOrderCodes,
  getCurrentTableToken,
  getGuestSessionToken,
  isAdditionalOrder,
  setCurrentTableToken,
  setGuestSessionToken,
} from "./qrOrderSession";

describe("QrOrderLocalSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores guest session token in localStorage", () => {
    setGuestSessionToken("QGS_ABC123");
    expect(getGuestSessionToken()).toBe("QGS_ABC123");
  });

  it("scopes active order codes by table token", () => {
    setCurrentTableToken("table-a");
    addActiveOrderCode("table-a", "QRO-AAA111");
    addActiveOrderCode("table-b", "QRO-BBB222");

    expect(getActiveOrderCodes("table-a")).toEqual(["QRO-AAA111"]);
    expect(getActiveOrderCodes("table-b")).toEqual(["QRO-BBB222"]);
    expect(getCurrentTableToken()).toBe("table-a");
  });

  it("appends additional orders without replacing previous codes", () => {
    addActiveOrderCode("table-a", "QRO-AAA111");
    addActiveOrderCode("table-a", "QRO-XYZ888");

    expect(getActiveOrderCodes("table-a")).toEqual(["QRO-AAA111", "QRO-XYZ888"]);
    expect(isAdditionalOrder("table-a", "QRO-XYZ888")).toBe(true);
    expect(isAdditionalOrder("table-a", "QRO-AAA111")).toBe(false);
  });
});
