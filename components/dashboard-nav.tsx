"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Clock, FileText, Home, Users, Database, AlertTriangle, CalendarPlus, ClipboardCheck } from "lucide-react"

interface DashboardNavProps {
  userRole: "employee" | "admin"
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()

  const employeeLinks = [
    {
      href: "/employee/dashboard",
      icon: Home,
      title: "Dashboard",
    },
    {
      href: "/employee/timesheet/select-week",
      icon: CalendarPlus,
      title: "New Timesheet",
    },
    {
      href: "/employee/timesheets",
      icon: FileText,
      title: "My Timesheets",
    },
  ]

  const adminLinks = [
    {
      href: "/admin/dashboard",
      icon: Home,
      title: "Dashboard",
    },
    {
      href: "/admin/approvals",
      icon: Clock,
      title: "Approvals",
    },
    {
      href: "/admin/users",
      icon: Users,
      title: "Users",
    },
    {
      href: "/admin/missing-timesheets",
      icon: AlertTriangle,
      title: "Missing Timesheets",
    },
    {
      href: "/admin/timesheet-review",
      icon: ClipboardCheck,
      title: "Timesheet Review",
    },
    {
      href: "/admin/database",
      icon: Database,
      title: "Database",
    },
  ]

  const links = userRole === "admin" ? adminLinks : employeeLinks

  return (
    <nav className="w-64 border-r bg-muted/20 h-full">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">Navigation</h2>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <link.icon className="mr-2 h-4 w-4" />
                <span>{link.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

