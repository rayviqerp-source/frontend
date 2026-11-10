"use client";

import type { ReactNode } from "react";
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
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "#2554e0",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#64748b",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e3e9f2",
  boxShadow: "0 8px 24px -8px rgba(11,27,51,0.18)",
  fontSize: 12,
  color: "#0b1b33",
};

function Axis({ dataKey }: { dataKey: string }) {
  return (
    <XAxis
      dataKey={dataKey}
      tick={{ fontSize: 11, fill: "#6b7c99" }}
      tickLine={false}
      axisLine={{ stroke: "#e3e9f2" }}
    />
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
  height = 260,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} action={action} />
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </Card>
  );
}

export function TrendChart({
  data,
  series,
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; name: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <Axis dataKey="month" />
        <YAxis tick={{ fontSize: 11, fill: "#6b7c99" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#d3dcea" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({
  data,
  dataKey,
  name = "Tickets",
  color = "#2554e0",
  height = 240,
  horizontal = false,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  name?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {horizontal ? (
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7c99" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={dataKey}
            tick={{ fontSize: 11, fill: "#3f5170" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f4f7fb" }} />
          <Bar dataKey={dataKey === "city" ? "count" : dataKey} name={name} fill={color} radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
          <Axis dataKey={dataKey} />
          <YAxis tick={{ fontSize: 11, fill: "#6b7c99" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f4f7fb" }} />
          <Bar dataKey="count" name={name} fill={color} radius={[6, 6, 0, 0]} barSize={26} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  innerLabel,
}: {
  data: { name: string; value: number }[];
  height?: number;
  innerLabel?: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="88%"
          paddingAngle={3}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#3f5170" }}
        />
        {innerLabel && (
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            className="fill-ink text-xl font-semibold"
            style={{ fontSize: 20, fontWeight: 600, fill: "#0b1b33" }}
          >
            {total}
          </text>
        )}
        {innerLabel && (
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            style={{ fontSize: 11, fill: "#6b7c99" }}
          >
            {innerLabel}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({
  data,
  series,
  height = 240,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; name: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <Axis dataKey="month" />
        <YAxis tick={{ fontSize: 11, fill: "#6b7c99" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.4}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  className,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const bar =
    tone === "success"
      ? "bg-success-500"
      : tone === "warning"
        ? "bg-warning-500"
        : tone === "danger"
          ? "bg-danger-500"
          : "bg-brand-600";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}
