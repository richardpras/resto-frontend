import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/stores/customerStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { useOutletStore } from "@/stores/outletStore";
import { CustomerRewardPanel } from "@/components/crm/CustomerRewardPanel";

export default function Customers() {
  const navigate = useNavigate();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const customers = useCustomerStore((s) => s.customers);
  const lifecycle = useCustomerStore((s) => s.lifecycle);
  const search = useCustomerStore((s) => s.search);
  const fetchCustomers = useCustomerStore((s) => s.fetchCustomers);
  const pointsBalanceByCustomer = useLoyaltyStore((s) => s.pointsBalanceByCustomer);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void fetchCustomers({ outletId: activeOutletId, page: 1, perPage: 50 });
  }, [activeOutletId, fetchCustomers]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(term) ||
      (customer.phone ?? "").includes(term) ||
      customer.code.toLowerCase().includes(term),
    );
  }, [customers, keyword]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CRM customer list, balances, and loyalty visibility.</p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search customer by name, phone, or code"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-4">
          <div className="grid grid-cols-5 text-xs text-muted-foreground border-b pb-2 mb-2">
            <span>Code</span>
            <span>Name</span>
            <span>Phone</span>
            <span>Points</span>
            <span>Gift Card</span>
          </div>
          <div className="space-y-1">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="w-full grid grid-cols-5 gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/40"
              >
                <span className="truncate">{customer.code}</span>
                <span className="truncate">{customer.name}</span>
                <span className="truncate">{customer.phone ?? "-"}</span>
                <span>{pointsBalanceByCustomer[customer.id] ?? customer.pointsBalance}</span>
                <span>Rp {customer.giftCardBalance.toLocaleString("id-ID")}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {lifecycle === "loading" ? "Loading customers..." : "No customer found for the current filter."}
              </p>
            )}
          </div>
          {search && <p className="mt-3 text-xs text-muted-foreground">Store search keyword: {search}</p>}
        </div>
        <CustomerRewardPanel customer={filtered[0] ?? null} pointsBalance={filtered[0] ? (pointsBalanceByCustomer[filtered[0].id] ?? filtered[0].pointsBalance) : 0} />
      </div>
    </div>
  );
}
