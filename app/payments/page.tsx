"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditCardIcon } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: number
  booking_number: string
  customer_name: string
  payment_date: string
  payment_method: string
  amount: number
  notes?: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => {
        setPayments(d.payments ?? [])
        setLoading(false)
      })
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const methodColor: Record<string, string> = {
    Cash: "secondary",
    UPI: "default",
    "Bank Transfer": "outline",
    Cheque: "outline",
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="size-5" />
            <h2 className="text-lg font-semibold">Payments</h2>
            <Badge variant="outline">{fmt(total)}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : payments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><CreditCardIcon className="size-12 mb-3 opacity-30" /><p>No payments recorded</p></CardContent></Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Booking</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Method</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 font-medium">{p.customer_name}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <Link href={`/bookings/${p.id}`} className="text-primary hover:underline text-xs font-mono">
                        {p.booking_number}
                      </Link>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant={(methodColor[p.payment_method] as "default" | "secondary" | "outline") ?? "outline"} className="text-xs">
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-semibold">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-semibold">
                <tr>
                  <td colSpan={4} className="p-3">Total Received</td>
                  <td className="p-3 text-right text-green-600">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
