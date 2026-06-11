"use client"

import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BellIcon } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory Management",
  "/categories": "Inventory Categories",
  "/customers": "Customer Management",
  "/bookings": "Event Bookings",
  "/quotations": "Quotations",
  "/payments": "Payments",
  "/invoices": "Invoices",
  "/laborers": "Labor Management",
  "/attendance": "Attendance",
  "/salary": "Salary Management",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/notifications": "Notifications",
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? "Swastik Mandap"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href="/notifications">
              <BellIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
