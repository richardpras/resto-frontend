import { create } from "zustand";
import {
  createShift as createShiftApi,
  deleteShift as deleteShiftApi,
  listEmployees,
  listShifts,
} from "@/lib/api";
import { employeeFromApi } from "@/lib/payrollMappers";

export type SalaryType = "monthly" | "daily" | "hourly";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  name: string;
  position: string;
  outlet: string;
  joinDate: string;
  salaryType: SalaryType;
  baseSalary: number;
  overtimeRate: number;
  status: EmployeeStatus;
  employeeNo?: string;
  email?: string;
  phone?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export function formatShiftTemplateLabel(shift: Pick<Shift, "name" | "code" | "startTime" | "endTime">): string {
  const title = shift.name?.trim() || shift.code?.trim() || "Shift";
  return `${title} (${shift.startTime}–${shift.endTime})`;
}

interface PayrollState {
  employees: Employee[];
  shifts: Shift[];

  addShift: (s: Omit<Shift, "id">) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  refreshEmployeesFromApi: () => Promise<void>;
  refreshShiftsFromApi: () => Promise<void>;
}

export const usePayrollStore = create<PayrollState>((set, get) => ({
  employees: [],
  shifts: [],

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
  refreshEmployeesFromApi: async () => {
    const rows = await listEmployees();
    set({ employees: rows.map(employeeFromApi) });
  },
  refreshShiftsFromApi: async () => {
    const rows = await listShifts();
    set({
      shifts: rows.map((r) => ({
        id: String(r.id),
        employeeId: "",
        date: "",
        code: r.code,
        name: r.name,
        startTime: r.startTime.slice(0, 5),
        endTime: r.endTime.slice(0, 5),
        notes: `${r.code} - ${r.name}`,
      })),
    });
  },
}));

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
