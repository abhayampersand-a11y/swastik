"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts"
import { BarChart3Icon, DownloadIcon } from "lucide-react"

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

export default function ReportsPage() {
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [financialData, setFinancialData] = useState<{ month: string; revenue: number; expenses: number; profit: number }[]>([])
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [stockData, setStockData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const [fin, book, inv] = await Promise.all([
        fetch(`/api/reports?type=financial&year=${year}`).then((r) => r.json()),
        fetch(`/api/reports?type=booking&year=${year}`).then((r) => r.json()),
        fetch(`/api/reports?type=inventory`).then((r) => r.json()),
      ])

      // Build monthly financial chart data
      const revMap = Object.fromEntries((fin.revenues ?? []).map((r: { month: string; total: string }) => [r.month, parseFloat(r.total)]))
      const expMap = Object.fromEntries((fin.expenses ?? []).map((e: { month: string; total: string }) => [e.month, parseFloat(e.total)]))
      const monthly = MONTHS.slice(1).map((name, idx) => {
        const m = idx + 1
        const revenue = revMap[m] ?? 0
        const expenses = expMap[m] ?? 0
        return { month: name, revenue, expenses, profit: revenue - expenses }
      })

      setFinancialData(monthly)
      setBookings(book.bookings ?? [])
      setStockData(inv.stock ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [year])

  const totalRevenue = financialData.reduce((s, r) => s + r.revenue, 0)
  const totalExpenses = financialData.reduce((s, r) => s + r.expenses, 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="size-5" />
            <h2 className="text-lg font-semibold">Reports</h2>
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024", "2025", "2026"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="financial">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 text-center"><div className="text-lg font-bold text-green-600">{fmt(totalRevenue)}</div><div className="text-xs text-muted-foreground">Total Revenue</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="text-lg font-bold text-red-500">{fmt(totalExpenses)}</div><div className="text-xs text-muted-foreground">Total Expenses</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className={`text-lg font-bold ${totalRevenue - totalExpenses >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(totalRevenue - totalExpenses)}</div><div className="text-xs text-muted-foreground">Net Profit</div></CardContent></Card>
            </div>

            {loading ? <Skeleton className="h-[300px] w-full" /> : (
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly P&L ({year})</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: unknown) => fmt(Number(value))} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#9ca3af" />
                      <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                        {financialData.map((d, i) => (
                          <Cell key={i} fill={d.profit >= 0 ? "#15803d" : "#b91c1c"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            {loading ? <Skeleton className="h-[400px] w-full" /> : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Booking No.</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Event</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{b.booking_number as string}</td>
                        <td className="p-3">{b.customer_name as string}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{b.event_name as string}</td>
                        <td className="p-3 text-muted-foreground">{new Date(b.event_date as string).toLocaleDateString("en-IN")}</td>
                        <td className="p-3 text-right font-medium">{fmt(b.total_amount as number)}</td>
                        <td className="p-3 text-center"><Badge variant="outline" className="text-xs">{b.status as string}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory">
            {loading ? <Skeleton className="h-[400px] w-full" /> : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-right p-3 font-medium">Available</th>
                      <th className="text-right p-3 font-medium">Reserved</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stockData.map((item, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{item.name as string}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{item.category_name as string}</td>
                        <td className="p-3 text-right">{item.total_quantity as number}</td>
                        <td className="p-3 text-right">{item.available_quantity as number}</td>
                        <td className="p-3 text-right">{item.reserved_quantity as number}</td>
                        <td className="p-3 text-center">
                          {(item.available_quantity as number) <= (item.low_stock_threshold as number) ? (
                            <Badge className="bg-yellow-500 text-white text-xs">Low Stock</Badge>
                          ) : (item.available_quantity as number) === 0 ? (
                            <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
