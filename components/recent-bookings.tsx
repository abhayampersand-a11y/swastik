"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { CalendarCheckIcon } from "lucide-react"

interface Booking {
  id: number
  booking_number: string
  customer_name: string
  event_name: string
  event_date: string
  status: string
  total_amount: number
}

const statusColors: Record<string, string> = {
  Inquiry: "secondary",
  Estimated: "outline",
  Confirmed: "default",
  Running: "default",
  Completed: "secondary",
  Closed: "secondary",
  Cancelled: "destructive",
}

export function RecentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bookings?limit=6&sort=recent")
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.bookings ?? [])
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheckIcon className="size-4" />
          Recent Bookings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No bookings yet
          </p>
        ) : (
          bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.customer_name}</div>
                <div className="text-muted-foreground text-xs">
                  {b.booking_number} · {b.event_name} ·{" "}
                  {new Date(b.event_date).toLocaleDateString("en-IN")}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                <Badge
                  variant={(statusColors[b.status] as "default" | "secondary" | "outline" | "destructive") ?? "outline"}
                  className="text-xs"
                >
                  {b.status}
                </Badge>
                <span className="text-xs font-medium">{fmt(b.total_amount)}</span>
              </div>
            </Link>
          ))
        )}
        <Link
          href="/bookings"
          className="block text-center text-xs text-primary hover:underline pt-1"
        >
          View all bookings →
        </Link>
      </CardContent>
    </Card>
  )
}
