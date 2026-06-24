import { describe, expect, it } from "vitest";
import { isPublicGuestPath, isStaffPwaPath } from "./publicGuestRoutes";

describe("publicGuestRoutes", () => {
  describe("isPublicGuestPath", () => {
    it("classifies QR guest routes", () => {
      expect(isPublicGuestPath("/qr/abc")).toBe(true);
      expect(isPublicGuestPath("/qr-order")).toBe(true);
      expect(isPublicGuestPath("/qr/order/ORD-1")).toBe(true);
      expect(isPublicGuestPath("/payment-status")).toBe(true);
      expect(isPublicGuestPath("/payment-status/abc")).toBe(true);
    });

    it("does not classify staff routes as guest", () => {
      expect(isPublicGuestPath("/login")).toBe(false);
      expect(isPublicGuestPath("/pos")).toBe(false);
      expect(isPublicGuestPath("/qr-orders")).toBe(false);
      expect(isPublicGuestPath("/employee/login")).toBe(false);
    });
  });

  describe("isStaffPwaPath", () => {
    it("classifies staff ERP and employee portal routes", () => {
      expect(isStaffPwaPath("/login")).toBe(true);
      expect(isStaffPwaPath("/employee")).toBe(true);
      expect(isStaffPwaPath("/employee/login")).toBe(true);
      expect(isStaffPwaPath("/pos")).toBe(true);
      expect(isStaffPwaPath("/hr/payroll/engine")).toBe(true);
    });

    it("excludes public guest routes", () => {
      expect(isStaffPwaPath("/qr/abc")).toBe(false);
      expect(isStaffPwaPath("/qr-order")).toBe(false);
      expect(isStaffPwaPath("/payment-status")).toBe(false);
    });
  });
});
