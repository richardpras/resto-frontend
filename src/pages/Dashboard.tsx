import { TrendingUp, DollarSign, ShoppingBag, Users, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const stats = [
  { label: "Today's Revenue", value: "Rp 12,450,000", change: "+12%", icon: DollarSign },
  { label: "Total Orders", value: "148", change: "+8%", icon: ShoppingBag },
  { label: "Avg Order Value", value: "Rp 84,100", change: "+3%", icon: TrendingUp },
  { label: "Customers", value: "112", change: "+15%", icon: Users },
];

const hourlyData = [
  { hour: "8AM", orders: 4 }, { hour: "9AM", orders: 8 }, { hour: "10AM", orders: 12 },
  { hour: "11AM", orders: 22 }, { hour: "12PM", orders: 35 }, { hour: "1PM", orders: 28 },
  { hour: "2PM", orders: 18 }, { hour: "3PM", orders: 14 }, { hour: "4PM", orders: 10 },
  { hour: "5PM", orders: 16 }, { hour: "6PM", orders: 30 }, { hour: "7PM", orders: 38 },
  { hour: "8PM", orders: 32 }, { hour: "9PM", orders: 20 },
];

const topMenus = [
  { name: "Nasi Goreng Special", qty: 42, revenue: "Rp 1,260,000" },
  { name: "Ayam Bakar", qty: 38, revenue: "Rp 1,520,000" },
  { name: "Es Teh Manis", qty: 65, revenue: "Rp 650,000" },
  { name: "Mie Goreng", qty: 28, revenue: "Rp 700,000" },
  { name: "Sate Ayam", qty: 25, revenue: "Rp 875,000" },
];

const recentTx = [
  { id: "#ORD-148", type: "Dine-in", total: "Rp 156,000", status: "Paid", time: "2 min ago" },
  { id: "#ORD-147", type: "Takeaway", total: "Rp 84,000", status: "Paid", time: "8 min ago" },
  { id: "#ORD-146", type: "Online", total: "Rp 210,000", status: "Cooking", time: "12 min ago" },
  { id: "#ORD-145", type: "Dine-in", total: "Rp 95,000", status: "Paid", time: "15 min ago" },
];

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of today's operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 pos-shadow-md border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-success flex items-center gap-0.5">
                {s.change} <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Peak Hours */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(147, 16%, 19%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(147, 16%, 19%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 12%, 90%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(147, 8%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(147, 8%, 46%)" />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="hsl(147, 16%, 19%)" fill="url(#colorOrders)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Menus */}
        <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Best Sellers</h3>
          <div className="space-y-3">
            {topMenus.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.qty} sold</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{m.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-foreground">{tx.id}</td>
                  <td className="py-3 text-muted-foreground">{tx.type}</td>
                  <td className="py-3 font-medium text-foreground">{tx.total}</td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
