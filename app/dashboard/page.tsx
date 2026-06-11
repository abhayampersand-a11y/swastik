import { MainLayout } from "@/components/main-layout"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DashboardAlerts } from "@/components/dashboard-alerts"
import { RecentBookings } from "@/components/recent-bookings"

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          <DashboardAlerts />
          <RecentBookings />
        </div>
      </div>
    </MainLayout>
  )
}
