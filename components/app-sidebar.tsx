"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useCachedApi } from "@/lib/redux/hooks"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  BoxesIcon,
  TagIcon,
  UsersIcon,
  CalendarCheckIcon,
  FileTextIcon,
  CreditCardIcon,
  ReceiptIcon,
  HardHatIcon,
  ClipboardListIcon,
  BanknoteIcon,
  TrendingDownIcon,
  BarChart3Icon,
  BellIcon,
  Settings2Icon,
  BuildingIcon,
} from "lucide-react"
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: BoxesIcon,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: TagIcon,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: UsersIcon,
  },
  {
    title: "Bookings",
    url: "/bookings",
    icon: CalendarCheckIcon,
  },
  {
    title: "Quotations",
    url: "/quotations",
    icon: FileTextIcon,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCardIcon,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: ReceiptIcon,
  },
]

const laborItems = [
  {
    title: "Laborers",
    url: "/laborers",
    icon: HardHatIcon,
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: ClipboardListIcon,
  },
  {
    title: "Salary",
    url: "/salary",
    icon: BanknoteIcon,
  },
]

const financeItems = [
  {
    title: "Expenses",
    url: "/expenses",
    icon: TrendingDownIcon,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3Icon,
  },
]

const secondaryItems = [
  {
    title: "Notifications",
    url: "/notifications",
    icon: BellIcon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2Icon,
  },
]

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: { title: string; url: string; icon: React.ElementType }[]
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.url}
              tooltip={item.title}
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data } = useCachedApi<{ settings: { business_name: string; email: string } }>("/api/settings")
  const businessName = data?.settings?.business_name || "Swastik Mandap"
  const businessEmail = data?.settings?.email || "admin@swastikmandap.com"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <BuildingIcon className="size-5!" />
                <span className="text-base font-semibold">{businessName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Main" items={navItems} pathname={pathname} />
        <NavGroup label="Labor" items={laborItems} pathname={pathname} />
        <NavGroup label="Finance" items={financeItems} pathname={pathname} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: businessName,
            email: businessEmail,
            avatar: "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
