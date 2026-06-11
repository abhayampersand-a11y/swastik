"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { fmtINR, amountInWords } from "@/lib/format"
import { PrinterIcon, ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

type Row = Record<string, string | number | null>

export default function InvoicePrintPage() {
  const { id } = useParams()
  const [data, setData] = useState<{ booking: Row; items: Row[]; payments: Row[] } | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then(setData)
  }, [id])

  if (!data?.booking) {
    return <div className="min-h-svh flex items-center justify-center text-sm text-gray-500">Loading invoice…</div>
  }

  const b = data.booking
  const items = data.items ?? []
  const payments = data.payments ?? []
  const paid = Number(b.advance_paid) || 0
  const balance = Number(b.remaining_balance) || 0
  const date = (d: unknown) =>
    d ? new Date(d as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

  return (
    <div className="min-h-svh bg-gray-100 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href={`/bookings/${id}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="size-4" /> Back to booking
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-950"
        >
          <PrinterIcon className="size-4" /> Print / Save as PDF
        </button>
      </div>

      {/* A4 sheet */}
      <div className="mx-auto my-6 max-w-[210mm] bg-white shadow-lg print:my-0 print:max-w-none print:shadow-none">
        {/* Maroon header band */}
        <div className="flex items-start justify-between bg-red-900 p-8 text-white print:p-6">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide">Swastik Mandap</h1>
            <p className="mt-1 text-sm text-red-100">Event &amp; Decoration Services</p>
            <p className="text-sm text-red-100">admin@swastikmandap.com</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-widest">INVOICE</div>
            <p className="mt-2 text-sm text-red-100">Invoice No: <span className="font-semibold text-white">INV-{String(b.booking_number).replace("BK-", "")}</span></p>
            <p className="text-sm text-red-100">Date: {date(new Date())}</p>
            <p className="text-sm text-red-100">Booking: {b.booking_number}</p>
          </div>
        </div>

        <div className="p-8 print:p-6">
          {/* Customer & Event */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-900">Billed To</p>
              <p className="font-semibold text-gray-900">{b.customer_name}</p>
              <p className="text-gray-600">{b.customer_mobile}</p>
              {b.customer_address && <p className="text-gray-600">{b.customer_address}</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-900">Event</p>
              <p className="font-semibold text-gray-900">{b.event_name} ({b.event_type})</p>
              <p className="text-gray-600">Event date: {date(b.event_date)}</p>
              {b.venue_address && <p className="text-gray-600">Venue: {b.venue_address}</p>}
            </div>
          </div>

          {/* Items */}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-red-900 text-left text-xs uppercase tracking-wide text-red-900">
                <th className="px-2 py-2.5">#</th>
                <th className="px-2 py-2.5">Item</th>
                <th className="px-2 py-2.5 text-right">Qty</th>
                <th className="px-2 py-2.5 text-right">Days</th>
                <th className="px-2 py-2.5 text-right">Rate/Day</th>
                <th className="px-2 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="px-2 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-2 py-2.5 font-medium text-gray-900">
                    {it.item_name} <span className="text-xs text-gray-400">({it.unit_type})</span>
                  </td>
                  <td className="px-2 py-2.5 text-right">{it.quantity}</td>
                  <td className="px-2 py-2.5 text-right">{it.days ?? 1}</td>
                  <td className="px-2 py-2.5 text-right">{fmtINR(Number(it.rental_rate))}</td>
                  <td className="px-2 py-2.5 text-right font-medium">{fmtINR(Number(it.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-between gap-8">
            {/* Payment history */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-900">Payments Received</p>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments recorded yet</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-600">{date(p.payment_date)}</td>
                        <td className="py-1.5 text-gray-600">{p.payment_method}</td>
                        <td className="py-1.5 text-right font-medium text-green-700">{fmtINR(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals */}
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{fmtINR(Number(b.subtotal))}</span>
              </div>
              {Number(b.discount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span><span>− {fmtINR(Number(b.discount))}</span>
                </div>
              )}
              {Number(b.gst_percent) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>GST ({Number(b.gst_percent)}%)</span><span>{fmtINR(Number(b.gst_amount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-red-900 pt-2 font-bold text-gray-900">
                <span>Grand Total</span><span>{fmtINR(Number(b.total_amount))}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Amount Paid</span><span>− {fmtINR(paid)}</span>
              </div>
              <div className={`flex justify-between rounded-md px-2 py-1.5 text-base font-bold ${balance > 0 ? "bg-red-50 text-red-900" : "bg-green-50 text-green-700"}`}>
                <span>{balance > 0 ? "Balance Due" : "Fully Paid"}</span>
                <span>{fmtINR(balance)}</span>
              </div>
            </div>
          </div>

          <p className="mt-2 text-right text-xs italic text-gray-500">
            Balance: {amountInWords(balance)}
          </p>

          {/* Footer */}
          <div className="mt-10 flex items-end justify-between">
            <p className="text-xs text-gray-400">
              Thank you for your business! · Damage or loss of items will be charged at purchase price.
            </p>
            <div className="text-center text-sm text-gray-600">
              <div className="mb-1 w-44 border-t border-gray-300 pt-1">For Swastik Mandap</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
