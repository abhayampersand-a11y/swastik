"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BellIcon, CheckCheckIcon, AlertTriangleIcon, CalendarIcon, CreditCardIcon, BanknoteIcon, CalendarPlusIcon, CheckCircleIcon } from "lucide-react"

interface Notification {
  id: number
  type: string
  title: string
  message?: string
  is_read: boolean
  created_at: string
}

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  low_stock: { icon: AlertTriangleIcon, color: "text-yellow-500" },
  upcoming_event: { icon: CalendarIcon, color: "text-blue-500" },
  pending_payment: { icon: CreditCardIcon, color: "text-red-500" },
  salary_due: { icon: BanknoteIcon, color: "text-orange-500" },
  new_booking: { icon: CalendarPlusIcon, color: "text-green-600" },
  payment_received: { icon: CheckCircleIcon, color: "text-green-600" },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    const res = await fetch("/api/notifications")
    const data = await res.json()
    setNotifications(data.notifications ?? [])
    setUnread(data.unread_count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchNotifications() }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "all" }),
    })
    fetchNotifications()
  }

  const markRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchNotifications()
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellIcon className="size-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unread > 0 && <Badge variant="destructive">{unread} unread</Badge>}
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheckIcon className="size-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <BellIcon className="size-12 mb-3 opacity-30" />
              <p>No notifications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] ?? { icon: BellIcon, color: "text-muted-foreground" }
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/30 ${!n.is_read ? "bg-primary/5 border-primary/20" : ""}`}
                >
                  <Icon className={`size-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${!n.is_read ? "" : "text-muted-foreground"}`}>
                      {n.title}
                    </div>
                    {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {!n.is_read && <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
