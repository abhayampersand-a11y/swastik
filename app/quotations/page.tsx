"use client"

import { useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { FileTextIcon, SearchIcon, ExternalLinkIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"
import { useCachedApi } from "@/lib/redux/hooks"

interface Quotation {
  id: number
  booking_number: string
  customer_name: string
  customer_mobile: string
  event_name: string
  event_type: string
  event_date: string
  status: string
  total_amount: number
}

export default function QuotationsPage() {
  const [search, setSearch] = useState("")
  const { data, loading } = useCachedApi<{ bookings: Quotation[] }>("/api/bookings?limit=200&sort=recent")
  const quotations = (data?.bookings ?? []).filter(
    (b) => b.status === "Inquiry" || b.status === "Estimated"
  )

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const filtered = quotations.filter(
    (q) =>
      !search ||
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.event_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            <h2 className="text-lg font-semibold">Quotations</h2>
            <Badge variant="outline">{filtered.length}</Badge>
          </div>
          <Button asChild>
            <Link href="/bookings/new">New Quotation</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground -mt-2">
          Bookings in Inquiry or Estimated status. Confirm a booking to move it out of quotations.
        </p>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, booking number or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
              <FileTextIcon className="size-12 opacity-30" />
              <p>No quotations right now</p>
              <Button variant="outline" asChild>
                <Link href="/bookings/new">Create a Quotation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors flex-wrap"
              >
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/bookings/${q.id}`} className="font-medium hover:underline">
                      {q.event_name}
                    </Link>
                    <Badge variant={q.status === "Estimated" ? "default" : "secondary"} className="text-xs">
                      {q.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {q.booking_number} · {q.customer_name} · {q.customer_mobile}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Event: {new Date(q.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div className="font-semibold">{fmt(Number(q.total_amount))}</div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/bookings/${q.id}/estimate`, "_blank")}
                  >
                    <PrinterIcon className="size-3.5 mr-1" /> Estimate PDF
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/bookings/${q.id}`}>
                      <ExternalLinkIcon className="size-3.5 mr-1" /> Open
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
