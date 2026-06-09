import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot, EngineeringMatrix } from "@/lib/api-integration/menuDashboardEndpoints";
import { aggregateQuadrants } from "@/lib/menu-dashboard/aggregations";

const QUADRANT_COLORS: Record<string, string> = {
  STAR: "hsl(var(--chart-2))",
  PUZZLE: "hsl(var(--chart-3))",
  PLOWHORSE: "hsl(var(--chart-4))",
  DOG: "hsl(var(--destructive))",
};

type Props = {
  salesTrend: Array<{ sale_date: string; total_sales: number }>;
  marginTrend: Array<{ date: string; marginPercent: number }>;
  foodCostTrend: Array<{ date: string; foodCostPercent: number }>;
  snapshots: DashboardSnapshot[];
  matrix?: EngineeringMatrix;
};

function shortDate(d: string) {
  if (!d) return "";
  const parts = d.split("-");
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d;
}

export function TrendCharts({ salesTrend, marginTrend, foodCostTrend, snapshots, matrix }: Props) {
  const revenueData = salesTrend.map((r) => ({
    date: shortDate(r.sale_date),
    revenue: r.total_sales,
  }));

  const marginData = marginTrend.map((r) => ({
    date: shortDate(r.date),
    margin: r.marginPercent,
  }));

  const foodCostData = foodCostTrend.map((r) => ({
    date: shortDate(r.date),
    foodCost: r.foodCostPercent,
  }));

  const forecastData = [...snapshots]
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .slice(-14)
    .map((s) => ({
      date: shortDate(s.snapshot_date),
      forecastRevenue: s.forecast_revenue,
      health: s.health_score,
    }));

  const alertTrend = [...snapshots]
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .slice(-14)
    .map((s) => ({
      date: shortDate(s.snapshot_date),
      open: s.active_alerts,
      critical: s.critical_alerts,
    }));

  const engineeringPie = matrix
    ? Object.entries(aggregateQuadrants(matrix.items)).map(([name, stats]) => ({
        name,
        value: stats.count,
      }))
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Margin Trend</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="margin" stroke="hsl(var(--chart-2))" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Food Cost Trend</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={foodCostData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="foodCost" stroke="hsl(var(--chart-4))" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Forecast Trend</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="forecastRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Engineering Distribution</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={engineeringPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {engineeringPie.map((entry) => (
                  <Cell key={entry.name} fill={QUADRANT_COLORS[entry.name] ?? "hsl(var(--muted))"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Alert Trend</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alertTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="open" stackId="a" fill="hsl(var(--chart-3))" />
              <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
