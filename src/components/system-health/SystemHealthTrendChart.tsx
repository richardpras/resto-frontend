import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TrendPoint = { date: string; value: number };

type Props = {
  title: string;
  data: TrendPoint[];
  valueLabel?: string;
  color?: string;
};

export function SystemHealthTrendChart({
  title,
  data,
  valueLabel = "value",
  color = "hsl(var(--primary))",
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">No trend data available</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({ date: d.date.slice(5), [valueLabel]: d.value }));

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={32} />
          <Tooltip />
          <Line type="monotone" dataKey={valueLabel} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
