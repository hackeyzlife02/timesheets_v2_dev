"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, ClipboardList, Clock, FileText, Home, Settings, Users, Database } from "lucide-react"

interface DashboardNavProps {
  userRole: "employee" | "admin"
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()

  const employeeLinks = [
    {
      title: "Dashboard",
      href: "/employee/dashboard",
      icon: Home,
    },
    {
      title: "Timesheets",
      href: "/employee/timesheets",
      icon: ClipboardList,
    },
    {
      title: "New Timesheet",
      href: "/employee/timesheet/new",
      icon: Clock,
    },
    {
      title: "History",
      href: "/employee/history",
      icon: Calendar,
    },
  ]

  const adminLinks = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: Home,
    },
    {
      title: "Approvals",
      href: "/admin/approvals",
      icon: ClipboardList,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: FileText,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Database",
      href: "/admin/database",
      icon: Database,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  const links = userRole === "admin" ? adminLinks : employeeLinks

  return (
    <nav className="hidden w-56 flex-col border-r bg-muted/40 md:flex">
      <div className="flex flex-col gap-2 p-4">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                pathname === link.href ? "bg-muted" : "transparent",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

