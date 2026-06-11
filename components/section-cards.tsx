"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarCheckIcon,
  UsersIcon,
  BoxesIcon,
  CreditCardIcon,
  BanknoteIcon,
  ReceiptIcon,
  ActivityIcon,
  AlertCircleIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  total_bookings: number
  upcoming_events: number
  active_events: number
  total_customers: number
  available_inventory_items: number
  pending_payments: number
  monthly_revenue: number
  monthly_expenses: number
  net_profit: number
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: {
  title: string
  value: string
  sub: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
  loading?: boolean
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {loading ? <Skeleton className="h-8 w-28" /> : value}
        </CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline">
              {trend === "up" ? (
                <TrendingUpIcon className="size-3" />
              ) : trend === "down" ? (
                <TrendingDownIcon className="size-3" />
              ) : (
                <ActivityIcon className="size-3" />
              )}
              {trendLabel}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">{sub}</CardFooter>
    </Card>
  )
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      <StatCard
        title="Total Bookings"
        value={loading ? "…" : String(stats?.total_bookings ?? 0)}
        sub="All time bookings"
        icon={CalendarCheckIcon}
        loading={loading}
      />
      <StatCard
        title="Upcoming Events"
        value={loading ? "…" : String(stats?.upcoming_events ?? 0)}
        sub="Events in next 30 days"
        icon={CalendarCheckIcon}
        trend="neutral"
        trendLabel="Upcoming"
        loading={loading}
      />
      <StatCard
        title="Active Events"
        value={loading ? "…" : String(stats?.active_events ?? 0)}
        sub="Currently running"
        icon={ActivityIcon}
        loading={loading}
      />
      <StatCard
        title="Total Customers"
        value={loading ? "…" : String(stats?.total_customers ?? 0)}
        sub="Registered customers"
        icon={UsersIcon}
        loading={loading}
      />
      <StatCard
        title="Available Inventory"
        value={loading ? "…" : String(stats?.available_inventory_items ?? 0)}
        sub="Items with stock > 0"
        icon={BoxesIcon}
        loading={loading}
      />
      <StatCard
        title="Pending Payments"
        value={loading ? "…" : String(stats?.pending_payments ?? 0)}
        sub="Customers with balance due"
        icon={CreditCardIcon}
        trend="down"
        trendLabel="Action needed"
        loading={loading}
      />
      <StatCard
        title="Monthly Revenue"
        value={loading ? "…" : fmt(stats?.monthly_revenue ?? 0)}
        sub={`Revenue this month`}
        icon={BanknoteIcon}
        trend="up"
        trendLabel="This month"
        loading={loading}
      />
      <StatCard
        title="Monthly Expenses"
        value={loading ? "…" : fmt(stats?.monthly_expenses ?? 0)}
        sub="Expenses this month"
        icon={TrendingDownIcon}
        loading={loading}
      />
      <StatCard
        title="Net Profit"
        value={loading ? "…" : fmt(stats?.net_profit ?? 0)}
        sub="Revenue − Expenses"
        icon={ReceiptIcon}
        trend={(stats?.net_profit ?? 0) >= 0 ? "up" : "down"}
        trendLabel={(stats?.net_profit ?? 0) >= 0 ? "Profit" : "Loss"}
        loading={loading}
      />
    </div>
  )
}
