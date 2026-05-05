import { create } from "zustand";
import {
  createAdjustment as createAdjustmentApi,
  createAttendance as createAttendanceApi,
  createLoan as createLoanApi,
  createOvertime as createOvertimeApi,
  createShift as createShiftApi,
  deleteAdjustment as deleteAdjustmentApi,
  deleteAttendance as deleteAttendanceApi,
  deleteLoan as deleteLoanApi,
  deleteOvertime as deleteOvertimeApi,
  deleteShift as deleteShiftApi,
  listAdjustments,
  listAttendances,
  listEmployees,
  listLoans,
  listOvertime,
  listPayrolls,
  listShifts,
  updateLoan as updateLoanApi,
  updateOvertime as updateOvertimeApi,
  type PayrollApiRow,
} from "@/lib/api";
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
  overtimes: Overtime[];
  adjustments: Adjustment[];
  shifts: Shift[];
  loans: Loan[];
  runs: PayrollRun[];
  apiPayrolls: PayrollApiRow[];

  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, e: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;

  addAttendance: (a: Omit<Attendance, "id">) => Promise<void>;
  updateAttendance: (id: string, a: Partial<Attendance>) => void;
  removeAttendance: (id: string) => Promise<void>;

  addOvertime: (o: Omit<Overtime, "id">) => Promise<void>;
  updateOvertime: (id: string, o: Partial<Overtime>) => Promise<void>;
  removeOvertime: (id: string) => Promise<void>;

  addAdjustment: (a: Omit<Adjustment, "id">) => Promise<void>;
  removeAdjustment: (id: string) => Promise<void>;

  addShift: (s: Omit<Shift, "id">) => Promise<void>;
  removeShift: (id: string) => Promise<void>;

  addLoan: (l: Omit<Loan, "id" | "paidInstallments" | "status">) => Promise<void>;
  payLoanInstallment: (id: string) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;

  calculateRun: (period: string, outlet?: string) => PayrollRun;
  saveRun: (run: PayrollRun) => void;
  finalizeRun: (id: string) => void;
  markRunPaid: (id: string) => void;
  deleteRun: (id: string) => void;
  refreshEmployeesFromApi: () => Promise<void>;
  refreshAttendanceFromApi: () => Promise<void>;
  refreshPayrollsFromApi: () => Promise<void>;
  refreshOvertimeFromApi: () => Promise<void>;
  refreshAdjustmentsFromApi: () => Promise<void>;
  refreshShiftsFromApi: () => Promise<void>;
  refreshLoansFromApi: () => Promise<void>;
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
  employees: [
    { id: "e1", name: "Andi Wijaya", position: "Cashier", outlet: "Main", joinDate: "2024-06-01", salaryType: "monthly", baseSalary: 5000000, overtimeRate: 30000, status: "active" },
    { id: "e2", name: "Siti Rahma", position: "Chef", outlet: "Main", joinDate: "2023-01-15", salaryType: "monthly", baseSalary: 8000000, overtimeRate: 50000, status: "active" },
    { id: "e3", name: "Budi Santoso", position: "Waiter", outlet: "Main", joinDate: "2025-02-10", salaryType: "daily", baseSalary: 150000, overtimeRate: 25000, status: "active" },
  ],
  attendance: [],
  overtimes: [],
  adjustments: [],
  shifts: [],
  loans: [],
  runs: [],
  apiPayrolls: [],

  addEmployee: (e) => set((s) => ({ employees: [...s.employees, { ...e, id: uid() }] })),
  updateEmployee: (id, e) => set((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, ...e } : x)) })),
  removeEmployee: (id) => set((s) => ({ employees: s.employees.filter((x) => x.id !== id) })),

  addAttendance: async (a) => {
    const employeeIdNum = Number(a.employeeId);
    if (!Number.isFinite(employeeIdNum) || employeeIdNum <= 0) {
      return;
    }
    await createAttendanceApi({
      employeeId: employeeIdNum,
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      status: a.status,
      notes: a.notes,
    });
    await get().refreshAttendanceFromApi();
  },
  updateAttendance: (id, a) => set((s) => ({ attendance: s.attendance.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
  removeAttendance: async (id) => {
    await deleteAttendanceApi(id);
    await get().refreshAttendanceFromApi();
  },

  addOvertime: async (o) => {
    await createOvertimeApi({
      employeeId: Number(o.employeeId),
      date: o.date,
      hours: o.hours,
      status: o.status,
      notes: o.notes,
    });
    await get().refreshOvertimeFromApi();
  },
  updateOvertime: async (id, o) => {
    await updateOvertimeApi(id, {
      employeeId: o.employeeId ? Number(o.employeeId) : undefined,
      date: o.date,
      hours: o.hours,
      status: o.status,
      notes: o.notes,
    });
    await get().refreshOvertimeFromApi();
  },
  removeOvertime: async (id) => {
    await deleteOvertimeApi(id);
    await get().refreshOvertimeFromApi();
  },

  addAdjustment: async (a) => {
    await createAdjustmentApi({
      employeeId: Number(a.employeeId),
      type: a.type,
      category: a.category,
      amount: a.amount,
      date: a.date,
      notes: a.notes,
    });
    await get().refreshAdjustmentsFromApi();
  },
  removeAdjustment: async (id) => {
    await deleteAdjustmentApi(id);
    await get().refreshAdjustmentsFromApi();
  },

  addShift: async (sh) => {
    const start = sh.startTime.length === 5 ? `${sh.startTime}:00` : sh.startTime;
    const end = sh.endTime.length === 5 ? `${sh.endTime}:00` : sh.endTime;
    await createShiftApi({
      code: `SHIFT-${start.slice(0, 5).replace(":", "")}-${end.slice(0, 5).replace(":", "")}-${Date.now().toString().slice(-4)}`,
      name: sh.notes?.trim() || `Shift ${start.slice(0, 5)}-${end.slice(0, 5)}`,
      startTime: start.slice(0, 5),
      endTime: end.slice(0, 5),
      lateToleranceMinutes: 10,
      overtimeAfterMinutes: 0,
      active: true,
    });
    await get().refreshShiftsFromApi();
  },
  removeShift: async (id) => {
    await deleteShiftApi(id);
    await get().refreshShiftsFromApi();
  },

  addLoan: async (l) => {
    await createLoanApi({
      employeeId: Number(l.employeeId),
      amount: l.amount,
      installments: l.installments,
      paidInstallments: 0,
      startDate: l.startDate,
      notes: l.notes,
      status: "active",
    });
    await get().refreshLoansFromApi();
  },
  payLoanInstallment: async (id) => {
    const loan = get().loans.find((x) => x.id === id);
    if (!loan) return;
    const paid = loan.paidInstallments + 1;
    await updateLoanApi(id, {
      paidInstallments: paid,
      status: paid >= loan.installments ? "completed" : "active",
    });
    await get().refreshLoansFromApi();
  },
  removeLoan: async (id) => {
    await deleteLoanApi(id);
    await get().refreshLoansFromApi();
  },

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
  refreshEmployeesFromApi: async () => {
    const rows = await listEmployees();
    set({ employees: rows.map(employeeFromApi) });
  },
  refreshAttendanceFromApi: async () => {
    const rows = await listAttendances();
    set({ attendance: rows.map(attendanceFromApi) });
  },
  refreshPayrollsFromApi: async () => {
    const rows = await listPayrolls();
    set({ apiPayrolls: rows });
  },
  refreshOvertimeFromApi: async () => {
    const rows = await listOvertime();
    set({
      overtimes: rows.map((r) => ({
        id: String(r.id),
        employeeId: String(r.employeeId),
        date: r.date,
        hours: r.hours,
        status: r.status,
        notes: r.notes ?? undefined,
      })),
    });
  },
  refreshAdjustmentsFromApi: async () => {
    const rows = await listAdjustments();
    set({
      adjustments: rows.map((r) => ({
        id: String(r.id),
        employeeId: String(r.employeeId),
        type: r.type,
        category: r.category,
        amount: r.amount,
        date: r.date,
        notes: r.notes ?? undefined,
      })),
    });
  },
  refreshShiftsFromApi: async () => {
    const rows = await listShifts();
    set({
      shifts: rows.map((r) => ({
        id: String(r.id),
        employeeId: "",
        date: "",
        startTime: r.startTime.slice(0, 5),
        endTime: r.endTime.slice(0, 5),
        notes: `${r.code} - ${r.name}`,
      })),
    });
  },
  refreshLoansFromApi: async () => {
    const rows = await listLoans();
    set({
      loans: rows.map((r) => ({
        id: String(r.id),
        employeeId: String(r.employeeId),
        amount: r.amount,
        installments: r.installments,
        paidInstallments: r.paidInstallments,
        startDate: r.startDate,
        notes: r.notes ?? undefined,
        status: r.status,
      })),
    });
  },
}));

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
