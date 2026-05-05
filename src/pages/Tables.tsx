import { useOrderStore } from "@/stores/orderStore";
import { motion } from "framer-motion";
import { Users, Clock, CreditCard, CheckCircle2 } from "lucide-react";

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

const statusConfig = {
  available: { label: "Available", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  occupied: { label: "Occupied", color: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  "waiting-payment": { label: "Waiting Payment", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
};

export default function Tables() {
  const { tables, orders, updateTableStatus } = useOrderStore();

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Table Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tables.filter((t) => t.status === "available").length} of {tables.length} tables available
          </p>
        </div>
        <div className="flex gap-2">
          {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => (
            <span key={key} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${cfg.color}`}>
              {cfg.label}: {tables.filter((t) => t.status === key).length}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {tables.map((table) => {
          const cfg = statusConfig[table.status];
          const linkedOrder = table.orderId ? orders.find((o) => o.id === table.orderId) : null;

          return (
            <motion.div key={table.id} layout whileHover={{ y: -2 }}
              className={`bg-card rounded-2xl border overflow-hidden pos-shadow-md transition-all ${
                table.status === "available" ? "border-success/20" :
                table.status === "occupied" ? "border-info/20" : "border-warning/20"
              }`}>
              <div className={`px-4 py-3 flex items-center justify-between ${
                table.status === "available" ? "bg-success/5" :
                table.status === "occupied" ? "bg-info/5" : "bg-warning/5"
              }`}>
                <span className="font-bold text-sm text-foreground">{table.name}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Users className="h-3 w-3" /> {table.seats} seats
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>

                {linkedOrder && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">{linkedOrder.code}</p>
                    {linkedOrder.customerName && (
                      <p className="text-xs text-muted-foreground">{linkedOrder.customerName}</p>
                    )}
                    <p className="text-xs font-bold text-primary">{formatRp(linkedOrder.total)}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      linkedOrder.paymentStatus === "paid" ? "bg-success/10 text-success" :
                      linkedOrder.paymentStatus === "partial" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {linkedOrder.paymentStatus === "paid" ? "Paid" : linkedOrder.paymentStatus === "partial" ? "Partial" : "Unpaid"}
                    </span>
                  </div>
                )}

                {table.status !== "available" && (
                  <button onClick={() => updateTableStatus(table.id, "available", undefined)}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Clear Table
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
