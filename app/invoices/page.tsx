"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ReceiptIcon } from "lucide-react"
import Link from "next/link"

interface Invoice {
  id: number
  invoice_number: string
  booking_number: string
  customer_name: string
  invoice_date: string
  total_amount: number
  remaining_balance: number
  payment_status: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => {
        setInvoices(d.invoices ?? [])
        setLoading(false)
      })
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const statusColor: Record<string, string> = { Pending: "secondary", Partial: "outline", Paid: "default" }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="size-5" />
          <h2 className="text-lg font-semibold">Invoices</h2>
          <Badge variant="outline">{invoices.length}</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : invoices.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><ReceiptIcon className="size-12 mb-3 opacity-30" /><p>No invoices yet</p></CardContent></Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Invoice No.</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Booking</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-3 font-medium">{inv.customer_name}</td>
                    <td className="p-3 hidden sm:table-cell text-xs text-primary">{inv.booking_number}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 text-right font-medium">{fmt(inv.total_amount)}</td>
                    <td className={`p-3 text-right font-medium ${inv.remaining_balance > 0 ? "text-red-500" : "text-green-600"}`}>
                      {fmt(inv.remaining_balance)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={(statusColor[inv.payment_status] as "default" | "secondary" | "outline") ?? "outline"} className="text-xs">
                        {inv.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
