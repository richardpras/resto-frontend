import { create } from "zustand";
import {
  listEmployees as listEmployeesApi,
  listAttendances as listAttendancesApi,
  listPayrolls as listPayrollsApi,
} from "@/lib/api";
import type { PayrollApiRow } from "@/lib/api-integration/hrEndpoints";
import { attendanceFromApi, employeeFromApi } from "@/lib/payrollMappers";

export type SalaryType = "monthly" | "daily" | "hourly";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  name: string;
  position: string;
  outlet: string;
  joinDate: string; // ISO
  salaryType: SalaryType;
  baseSalary: number; // per month/day/hour depending on type
  overtimeRate: number; // per hour
  status: EmployeeStatus;
  /** From HR API — required for updates. */
  employeeNo?: string;
  email?: string;
  phone?: string;
}

export type AttendanceStatus = "present" | "late" | "absent";

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  status: AttendanceStatus;
  notes?: string;
}

export interface Overtime {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

export type AdjustmentType = "allowance" | "deduction";
export interface Adjustment {
  id: string;
  employeeId: string;
  type: AdjustmentType;
  category: string; // bonus, transport, meal, lateness, penalty, loan
  amount: number;
  date: string;
  notes?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  amount: number;
  installments: number; // months
  paidInstallments: number;
  startDate: string;
  notes?: string;
  status: "active" | "completed";
}

export interface PayrollLine {
  employeeId: string;
  baseSalary: number;
  attendanceAdjustment: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  loanDeduction: number;
  taxableIncome: number;
  pph21: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  overtimeHours: number;
}

export interface PayrollRun {
  id: string;
  period: string; // YYYY-MM
  outlet?: string;
  status: "draft" | "processed" | "paid";
  createdAt: string;
  paidAt?: string;
  lines: PayrollLine[];
}

interface PayrollState {
  employees: Employee[];
  attendance: Attendance[];
  /** Posted payroll rows from `GET /payrolls` (when token + permission allow). */
  apiPayrolls: PayrollApiRow[];
  overtimes: Overtime[];
  adjustments: Adjustment[];
  shifts: Shift[];
  loans: Loan[];
  runs: PayrollRun[];

  refreshEmployeesFromApi: () => Promise<void>;
  refreshAttendanceFromApi: () => Promise<void>;
  refreshPayrollsFromApi: () => Promise<void>;

  updateAttendance: (id: string, a: Partial<Attendance>) => void;

  addOvertime: (o: Omit<Overtime, "id">) => void;
  updateOvertime: (id: string, o: Partial<Overtime>) => void;
  removeOvertime: (id: string) => void;

  addAdjustment: (a: Omit<Adjustment, "id">) => void;
  removeAdjustment: (id: string) => void;

  addShift: (s: Omit<Shift, "id">) => void;
  removeShift: (id: string) => void;

  addLoan: (l: Omit<Loan, "id" | "paidInstallments" | "status">) => void;
  payLoanInstallment: (id: string) => void;
  removeLoan: (id: string) => void;

  calculateRun: (period: string, outlet?: string) => PayrollRun;
  saveRun: (run: PayrollRun) => void;
  finalizeRun: (id: string) => void;
  markRunPaid: (id: string) => void;
  deleteRun: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Simple PPH21 brackets (annualized, basic simulation in IDR)
function calcPPH21(monthlyTaxable: number): number {
  const annual = monthlyTaxable * 12;
  const ptkp = 54000000; // single
  const pkp = Math.max(0, annual - ptkp);
  let tax = 0;
  let remaining = pkp;
  const brackets = [
    [60000000, 0.05],
    [190000000, 0.15],
    [250000000, 0.25],
    [4500000000, 0.3],
    [Infinity, 0.35],
  ] as const;
  for (const [limit, rate] of brackets) {
    const slice = Math.min(remaining, limit);
    tax += slice * rate;
    remaining -= slice;
    if (remaining <= 0) break;
  }
  return Math.round(tax / 12);
}

export const usePayrollStore = create<PayrollState>((set, get) => ({
  employees: [],
  attendance: [],
  apiPayrolls: [],
  overtimes: [],
  adjustments: [],
  shifts: [],
  loans: [],
  runs: [],

  refreshEmployeesFromApi: async () => {
    const rows = await listEmployeesApi();
    set({ employees: rows.map(employeeFromApi) });
  },

  refreshAttendanceFromApi: async () => {
    const rows = await listAttendancesApi();
    set({ attendance: rows.map(attendanceFromApi) });
  },

  refreshPayrollsFromApi: async () => {
    try {
      const rows = await listPayrollsApi();
      set({ apiPayrolls: rows });
    } catch {
      set({ apiPayrolls: [] });
    }
  },

  updateAttendance: (id, a) => set((s) => ({ attendance: s.attendance.map((x) => (x.id === id ? { ...x, ...a } : x)) })),

  addOvertime: (o) => set((s) => ({ overtimes: [...s.overtimes, { ...o, id: uid() }] })),
  updateOvertime: (id, o) => set((s) => ({ overtimes: s.overtimes.map((x) => (x.id === id ? { ...x, ...o } : x)) })),
  removeOvertime: (id) => set((s) => ({ overtimes: s.overtimes.filter((x) => x.id !== id) })),

  addAdjustment: (a) => set((s) => ({ adjustments: [...s.adjustments, { ...a, id: uid() }] })),
  removeAdjustment: (id) => set((s) => ({ adjustments: s.adjustments.filter((x) => x.id !== id) })),

  addShift: (sh) => set((s) => ({ shifts: [...s.shifts, { ...sh, id: uid() }] })),
  removeShift: (id) => set((s) => ({ shifts: s.shifts.filter((x) => x.id !== id) })),

  addLoan: (l) => set((s) => ({ loans: [...s.loans, { ...l, id: uid(), paidInstallments: 0, status: "active" }] })),
  payLoanInstallment: (id) =>
    set((s) => ({
      loans: s.loans.map((x) => {
        if (x.id !== id) return x;
        const paid = x.paidInstallments + 1;
        return { ...x, paidInstallments: paid, status: paid >= x.installments ? "completed" : "active" };
      }),
    })),
  removeLoan: (id) => set((s) => ({ loans: s.loans.filter((x) => x.id !== id) })),

  calculateRun: (period, outlet) => {
    const { employees, attendance, overtimes, adjustments, loans } = get();
    const [year, month] = period.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = 22; // standard working days assumption

    const filtered = employees.filter((e) => e.status === "active" && (!outlet || e.outlet === outlet));

    const lines: PayrollLine[] = filtered.map((emp) => {
      const empAtt = attendance.filter((a) => a.employeeId === emp.id && a.date.startsWith(period));
      const presentDays = empAtt.filter((a) => a.status !== "absent").length;
      const empOt = overtimes.filter((o) => o.employeeId === emp.id && o.date.startsWith(period) && o.status === "approved");
      const otHours = empOt.reduce((sum, o) => sum + o.hours, 0);
      const empAdj = adjustments.filter((a) => a.employeeId === emp.id && a.date.startsWith(period));
      const allowances = empAdj.filter((a) => a.type === "allowance").reduce((s, a) => s + a.amount, 0);
      const deductions = empAdj.filter((a) => a.type === "deduction").reduce((s, a) => s + a.amount, 0);

      let baseSalary = 0;
      let attendanceAdjustment = 0;
      if (emp.salaryType === "monthly") {
        baseSalary = emp.baseSalary;
        // Deduct for absent days
        const absentDays = Math.max(0, workingDays - presentDays);
        attendanceAdjustment = -Math.round((emp.baseSalary / workingDays) * absentDays);
      } else if (emp.salaryType === "daily") {
        baseSalary = emp.baseSalary * presentDays;
      } else {
        // hourly - assume 8 hours per present day
        baseSalary = emp.baseSalary * presentDays * 8;
      }

      const overtimePay = otHours * emp.overtimeRate;

      const activeLoan = loans.find((l) => l.employeeId === emp.id && l.status === "active");
      const loanDeduction = activeLoan ? Math.round(activeLoan.amount / activeLoan.installments) : 0;

      const taxableIncome = baseSalary + attendanceAdjustment + overtimePay + allowances;
      const pph21 = calcPPH21(taxableIncome);
      const netSalary = taxableIncome - deductions - loanDeduction - pph21;

      return {
        employeeId: emp.id,
        baseSalary,
        attendanceAdjustment,
        overtimePay,
        allowances,
        deductions,
        loanDeduction,
        taxableIncome,
        pph21,
        netSalary,
        workingDays,
        presentDays,
        overtimeHours: otHours,
      };
    });

    return {
      id: uid(),
      period,
      outlet,
      status: "draft",
      createdAt: new Date().toISOString(),
      lines,
    };
  },

  saveRun: (run) => set((s) => {
    const exists = s.runs.find((r) => r.id === run.id);
    if (exists) return { runs: s.runs.map((r) => (r.id === run.id ? run : r)) };
    return { runs: [...s.runs, run] };
  }),
  finalizeRun: (id) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, status: "processed" } : r)) })),
  markRunPaid: (id) => {
    const run = get().runs.find((r) => r.id === id);
    if (run) {
      // pay loan installments for employees with deduction
      run.lines.forEach((line) => {
        if (line.loanDeduction > 0) {
          const loan = get().loans.find((l) => l.employeeId === line.employeeId && l.status === "active");
          if (loan) get().payLoanInstallment(loan.id);
        }
      });
    }
    set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, status: "paid", paidAt: new Date().toISOString() } : r)) }));
  },
  deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
}));

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
