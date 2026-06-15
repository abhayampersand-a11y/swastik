"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { PlusIcon, SearchIcon, CalendarCheckIcon } from "lucide-react"
import Link from "next/link"

interface Booking {
  id: number
  booking_number: string
  customer_name: string
  customer_mobile: string
  event_name: string
  event_type: string
  event_date: string
  venue_address: string
  status: string
  total_amount: number
  advance_paid: number
  remaining_balance: number
}

const STATUS_LIST = ["All", "Inquiry", "Estimated", "Confirmed", "Running", "Completed", "Closed", "Cancelled"]

const statusColor: Record<string, string> = {
  Inquiry: "secondary",
  Estimated: "outline",
  Confirmed: "default",
  Running: "default",
  Completed: "secondary",
  Closed: "secondary",
  Cancelled: "destructive",
}

const PAGE_SIZE = 10

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [page, setPage] = useState(1)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setPage(1)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status !== "All") params.set("status", status)
    const res = await fetch(`/api/bookings?${params}`)
    const data = await res.json()
    setBookings(data.bookings ?? [])
    setLoading(false)
  }, [search, status])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const totalPages = Math.ceil(bookings.length / PAGE_SIZE)
  const paged = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheckIcon className="size-5" />
            <h2 className="text-lg font-semibold">Bookings</h2>
            <Badge variant="outline">{bookings.length}</Badge>
          </div>
          <Button asChild>
            <Link href="/bookings/new">
              <PlusIcon className="size-4 mr-1" /> New Booking
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search booking, customer, event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <CalendarCheckIcon className="size-12 mb-3 opacity-30" />
              <p>No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {paged.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{b.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{b.booking_number}</span>
                      <Badge
                        variant={(statusColor[b.status] as "default" | "secondary" | "outline" | "destructive") ?? "outline"}
                        className="text-xs"
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {b.event_name} · {b.event_type} ·{" "}
                      <span className="font-medium text-foreground">
                        {new Date(b.event_date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    {b.venue_address && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{b.venue_address}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{fmt(b.total_amount)}</div>
                    {b.remaining_balance > 0 && (
                      <div className="text-xs text-red-500">Due: {fmt(b.remaining_balance)}</div>
                    )}
                    {b.remaining_balance <= 0 && b.total_amount > 0 && (
                      <div className="text-xs text-green-600">Paid</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, bookings.length)} of {bookings.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                Previous
              </Button>
              <span className="px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
