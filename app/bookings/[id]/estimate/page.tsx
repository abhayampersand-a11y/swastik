"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { fmtINR, amountInWords } from "@/lib/format"
import { PrinterIcon, ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { useCachedApi } from "@/lib/redux/hooks"

type Row = Record<string, string | number | null>

interface BusinessSettings {
  business_name: string
  tagline: string
  email: string
  contact_number: string
  address: string
}

export default function EstimatePrintPage() {
  const { id } = useParams()
  const [data, setData] = useState<{ booking: Row; items: Row[] } | null>(null)
  const { data: settingsData } = useCachedApi<{ settings: BusinessSettings }>("/api/settings")
  const biz = settingsData?.settings

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then(setData)
  }, [id])

  if (!data?.booking) {
    return <div className="min-h-svh flex items-center justify-center text-sm text-gray-500">Loading estimate…</div>
  }

  const b = data.booking
  const items = data.items ?? []
  const date = (d: unknown) =>
    d ? new Date(d as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"
  const validUntil = new Date(Date.now() + 15 * 86400_000)

  return (
    <div className="min-h-svh bg-gray-100 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href={`/bookings/${id}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="size-4" /> Back to booking
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <PrinterIcon className="size-4" /> Print / Save as PDF
        </button>
      </div>

      {/* A4 sheet */}
      <div className="mx-auto my-6 max-w-[210mm] bg-white p-10 shadow-lg print:my-0 print:max-w-none print:p-8 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 border-amber-500 pb-5">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gray-900">{biz?.business_name || "Swastik Mandap"}</h1>
            {(biz?.tagline ?? "Event & Decoration Services") && (
              <p className="mt-1 text-sm text-gray-500">{biz?.tagline ?? "Event & Decoration Services"}</p>
            )}
            {biz?.address && <p className="text-sm text-gray-500">{biz.address}</p>}
            {(biz?.contact_number || biz?.email || !biz) && (
              <p className="text-sm text-gray-500">
                {[biz?.contact_number, biz?.email ?? (biz ? "" : "admin@swastikmandap.com")].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="inline-block rounded-md border-2 border-amber-500 px-4 py-1.5 text-xl font-bold tracking-widest text-amber-600">
              ESTIMATE
            </div>
            <p className="mt-2 text-sm text-gray-600">Ref: <span className="font-medium">{b.booking_number}/EST</span></p>
            <p className="text-sm text-gray-600">Date: {date(new Date())}</p>
            <p className="text-sm text-gray-600">Valid until: {date(validUntil)}</p>
          </div>
        </div>

        {/* Customer & Event */}
        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Estimate For</p>
            <p className="font-semibold text-gray-900">{b.customer_name}</p>
            <p className="text-gray-600">{b.customer_mobile}</p>
            {b.customer_address && <p className="text-gray-600">{b.customer_address}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Event Details</p>
            <p className="font-semibold text-gray-900">{b.event_name} ({b.event_type})</p>
            <p className="text-gray-600">Event date: {date(b.event_date)}</p>
            {b.setup_date && <p className="text-gray-600">Setup: {date(b.setup_date)} · Return: {date(b.return_date)}</p>}
            {b.venue_address && <p className="text-gray-600">Venue: {b.venue_address}</p>}
          </div>
        </div>

        {/* Items */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="bg-amber-50 text-left text-xs uppercase tracking-wide text-amber-800">
              <th className="rounded-l-md px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Item</th>
              <th className="px-3 py-2.5 text-right">Qty</th>
              <th className="px-3 py-2.5 text-right">Days</th>
              <th className="px-3 py-2.5 text-right">Rate/Day</th>
              <th className="rounded-r-md px-3 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900">
                  {it.item_name} <span className="text-xs text-gray-400">({it.unit_type})</span>
                </td>
                <td className="px-3 py-2.5 text-right">{it.quantity}</td>
                <td className="px-3 py-2.5 text-right">{it.days ?? 1}</td>
                <td className="px-3 py-2.5 text-right">{fmtINR(Number(it.rental_rate))}</td>
                <td className="px-3 py-2.5 text-right font-medium">{fmtINR(Number(it.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
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
            <div className="flex justify-between border-t-2 border-amber-500 pt-2 text-base font-bold text-gray-900">
              <span>Estimated Total</span><span>{fmtINR(Number(b.total_amount))}</span>
            </div>
          </div>
        </div>

        <p className="mt-2 text-right text-xs italic text-gray-500">
          {amountInWords(Number(b.total_amount))}
        </p>

        {/* Terms */}
        <div className="mt-8 rounded-md bg-amber-50 p-4 text-xs text-gray-600">
          <p className="mb-1.5 font-semibold uppercase tracking-wide text-amber-800">Terms &amp; Conditions</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>This is an estimate only — not a confirmed booking or tax invoice.</li>
            <li>Prices are valid for 15 days from the date of this estimate.</li>
            <li>Booking is confirmed only after advance payment.</li>
            <li>Items are subject to availability on the event date.</li>
            <li>Any damage or loss of items will be charged at purchase price.</li>
          </ul>
        </div>

        {/* Signature */}
        <div className="mt-12 flex justify-between text-sm text-gray-600">
          <div className="text-center">
            <div className="mb-1 w-44 border-t border-gray-300 pt-1">Customer Signature</div>
          </div>
          <div className="text-center">
            <div className="mb-1 w-44 border-t border-gray-300 pt-1">For {biz?.business_name || "Swastik Mandap"}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
