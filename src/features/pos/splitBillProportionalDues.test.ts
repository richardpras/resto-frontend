import { describe, expect, it } from "vitest";
import {
  applyByItemTotalDuesWithTaxScale,
  personDueWithBillTaxShare,
} from "./splitBillProportionalDues";
import type { SplitPerson } from "@/stores/orderStore";

const lines = [
  { id: "1", price: 45000, qty: 1 },
  { id: "2", price: 42000, qty: 1 },
  { id: "3", price: 34000, qty: 1 },
  { id: "4", price: 28000, qty: 1 },
];

const catalogSubtotal = 149000;
const billTotal = 163900;

describe("splitBillProportionalDues", () => {
  it("includes tax share per person immediately from catalog ratio", () => {
    const person1Raw = 45000 + 34000;
    expect(personDueWithBillTaxShare(person1Raw, catalogSubtotal, billTotal)).toBe(
      Math.round((person1Raw / catalogSubtotal) * billTotal),
    );
  });

  it("keeps person 1 total stable when person 2 assigns more items", () => {
    const person1Only: SplitPerson[] = [
      { label: "P1", items: [{ itemId: "1", qty: 1 }, { itemId: "3", qty: 1 }], payments: [], totalDue: 0 },
      { label: "P2", items: [], payments: [], totalDue: 0 },
    ];
    const person1And2Partial: SplitPerson[] = [
      { label: "P1", items: [{ itemId: "1", qty: 1 }, { itemId: "3", qty: 1 }], payments: [], totalDue: 0 },
      { label: "P2", items: [{ itemId: "2", qty: 1 }], payments: [], totalDue: 0 },
    ];

    const duesP1Only = applyByItemTotalDuesWithTaxScale(person1Only, lines, billTotal);
    const duesPartial = applyByItemTotalDuesWithTaxScale(person1And2Partial, lines, billTotal);

    expect(duesP1Only[0].totalDue).toBe(duesPartial[0].totalDue);
    expect(duesP1Only[0].totalDue).toBeGreaterThan(79000);
  });

  it("sums to bill total when every item is assigned", () => {
    const fullyAssigned: SplitPerson[] = [
      {
        label: "P1",
        items: [
          { itemId: "1", qty: 1 },
          { itemId: "3", qty: 1 },
        ],
        payments: [],
        totalDue: 0,
      },
      {
        label: "P2",
        items: [
          { itemId: "2", qty: 1 },
          { itemId: "4", qty: 1 },
        ],
        payments: [],
        totalDue: 0,
      },
    ];

    const dues = applyByItemTotalDuesWithTaxScale(fullyAssigned, lines, billTotal);
    expect(dues[0].totalDue + dues[1].totalDue).toBe(billTotal);
  });
});
