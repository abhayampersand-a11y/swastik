"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PhoneIcon, MapPinIcon, CalendarCheckIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

interface Customer {
  id: number
  name: string
  mobile: string
  alternate_mobile?: string
  address?: string
  city?: string
  notes?: string
}

interface CustomerBooking {
  id: number
  booking_number: string
  event_name: string
  event_type: string
  event_date: string
  status: string
  total_amount: string
  paid: string
}

const statusColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Inquiry: "secondary", Estimated: "outline", Confirmed: "default",
  Running: "default", Completed: "secondary", Closed: "secondary", Cancelled: "destructive",
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d.customer ?? null)
        setBookings(d.bookings ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </MainLayout>
    )
  }

  if (!customer) {
    return (
      <MainLayout>
        <div className="p-6 flex flex-col items-center gap-3 text-muted-foreground py-20">
          <p>Customer not found</p>
          <Button variant="outline" onClick={() => router.push("/customers")}>Back to Customers</Button>
        </div>
      </MainLayout>
    )
  }

  const activeBookings = bookings.filter((b) => b.status !== "Cancelled")
  const totalBusiness = activeBookings.reduce((s, b) => s + parseFloat(b.total_amount || "0"), 0)
  const totalPaid = activeBookings.reduce((s, b) => s + parseFloat(b.paid || "0"), 0)
  const outstanding = totalBusiness - totalPaid

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{customer.name}</h2>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <PhoneIcon className="size-3" /> {customer.mobile}
                {customer.alternate_mobile && <span>· {customer.alternate_mobile}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
            <Button asChild>
              <Link href="/bookings/new"><PlusIcon className="size-4 mr-1" /> New Booking</Link>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="pt-4 text-center">
            <div className="text-lg font-bold">{activeBookings.length}</div>
            <div className="text-xs text-muted-foreground">Bookings</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-lg font-bold">{fmt(totalBusiness)}</div>
            <div className="text-xs text-muted-foreground">Total Business</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-lg font-bold text-green-600">{fmt(totalPaid)}</div>
            <div className="text-xs text-muted-foreground">Total Paid</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className={`text-lg font-bold ${outstanding > 0 ? "text-red-500" : "text-green-600"}`}>{fmt(outstanding)}</div>
            <div className="text-xs text-muted-foreground">Outstanding</div>
          </CardContent></Card>
        </div>

        {/* Details */}
        {(customer.address || customer.city || customer.notes) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {(customer.address || customer.city) && (
                <div className="flex items-start gap-2">
                  <MapPinIcon className="size-3.5 mt-0.5 shrink-0" />
                  {[customer.address, customer.city].filter(Boolean).join(", ")}
                </div>
              )}
              {customer.notes && <div className="italic">{customer.notes}</div>}
            </CardContent>
          </Card>
        )}

        {/* Bookings */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <CalendarCheckIcon className="size-4" /> Booking History
          </CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => {
                  const total = parseFloat(b.total_amount || "0")
                  const paid = parseFloat(b.paid || "0")
                  const due = total - paid
                  return (
                    <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors flex-wrap">
                      <div className="flex-1 min-w-44">
                        <div className="flex items-center gap-2">
                          <Link href={`/bookings/${b.id}`} className="font-medium text-sm hover:underline">
                            {b.event_name}
                          </Link>
                          <Badge variant={statusColor[b.status] ?? "outline"} className="text-xs">{b.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.booking_number} · {new Date(b.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{fmt(total)}</div>
                        {b.status !== "Cancelled" && (
                          due > 0
                            ? <div className="text-xs text-red-500">Due: {fmt(due)}</div>
                            : <div className="text-xs text-green-600">Fully paid</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
