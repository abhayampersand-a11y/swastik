"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCachedApi } from "@/lib/redux/hooks"

interface ChartPoint {
  month: string
  revenue: number
  expenses: number
  profit: number
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function ChartAreaInteractive() {
  const [year, setYear] = React.useState(String(new Date().getFullYear()))
  const { data: chartData, loading } = useCachedApi<{ monthly: ChartPoint[] }>(
    `/api/dashboard/charts?year=${year}`
  )
  const data = chartData?.monthly ?? []

  const years = ["2024", "2025", "2026"]

  return (
    <div className="grid gap-4 @xl/main:grid-cols-2">
      {/* Revenue vs Expenses Area Chart */}
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <CardDescription>Monthly comparison ({year})</CardDescription>
          <CardAction>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatINR(Number(value)),
                    name === "revenue" ? "Revenue" : "Expenses",
                  ]}
                />
                <Area dataKey="revenue" type="monotone" fill="url(#revGrad)" stroke="#16a34a" strokeWidth={2} />
                <Area dataKey="expenses" type="monotone" fill="url(#expGrad)" stroke="#ef4444" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net Profit Bar Chart */}
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Net Profit</CardTitle>
          <CardDescription>Monthly profit/loss ({year})</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: unknown) => [formatINR(Number(value)), "Net Profit"]} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]} name="Net Profit">
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.profit >= 0 ? "#16a34a" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
