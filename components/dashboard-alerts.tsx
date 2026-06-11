"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCachedApi } from "@/lib/redux/hooks"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangleIcon,
  CalendarIcon,
  CreditCardIcon,
  BanknoteIcon,
} from "lucide-react"

interface Alert {
  type: "low_stock" | "upcoming_event" | "pending_payment" | "salary_due"
  message: string
  detail?: string
}

const alertConfig = {
  low_stock: { icon: AlertTriangleIcon, color: "text-yellow-500", label: "Low Stock" },
  upcoming_event: { icon: CalendarIcon, color: "text-blue-500", label: "Event" },
  pending_payment: { icon: CreditCardIcon, color: "text-red-500", label: "Payment" },
  salary_due: { icon: BanknoteIcon, color: "text-orange-500", label: "Salary" },
}

export function DashboardAlerts() {
  const { data, loading } = useCachedApi<{ alerts: Alert[] }>("/api/dashboard/alerts")
  const alerts = data?.alerts ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4 text-yellow-500" />
          Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No alerts right now
          </p>
        ) : (
          alerts.map((alert, i) => {
            const cfg = alertConfig[alert.type]
            const Icon = cfg.icon
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <Icon className={`size-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{alert.message}</div>
                  {alert.detail && (
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {alert.detail}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {cfg.label}
                </Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
