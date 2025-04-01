"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Loader2, Calendar, RefreshCw, CheckCircle, FileText } from "lucide-react"
import { formatDate, getStartOfWeek } from "@/lib/date-utils"

export default function ApprovalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek())
  const [pendingTimesheets, setPendingTimesheets] = useState<any[]>([])
  const [timesheetsLoading, setTimesheetsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    if (!isAdmin()) {
      router.push("/employee/dashboard")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)

    // Fetch pending timesheets for the current week
    fetchPendingTimesheets(weekStartDate)
  }, [router, weekStartDate])

  const fetchPendingTimesheets = async (date: Date) => {
    try {
      setTimesheetsLoading(true)
      setError(null)

      const formattedDate = formatDate(date)
      const response = await fetch(`/api/admin/approvals?weekStartDate=${formattedDate}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Pending timesheets:", data)

      if (data.success) {
        setPendingTimesheets(data.data || [])
      } else {
        setError(data.message || "Failed to fetch pending timesheets")
        setPendingTimesheets([])
      }
    } catch (error) {
      console.error("Error fetching pending timesheets:", error)
      setError(
        "An error occurred while fetching pending timesheets: " +
          (error instanceof Error ? error.message : String(error)),
      )
      setPendingTimesheets([])
    } finally {
      setTimesheetsLoading(false)
    }
  }

  // Function to navigate to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStartDate)
    prevWeek.setDate(prevWeek.getDate() - 7)
    setWeekStartDate(prevWeek)
  }

  // Function to navigate to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(weekStartDate)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setWeekStartDate(nextWeek)
  }

  // Function to go to current week
  const goToCurrentWeek = () => {
    setWeekStartDate(getStartOfWeek())
  }

  // Function to approve a timesheet
  const approveTimesheet = async (timesheetId: number) => {
    try {
      const response = await fetch(`/api/admin/approvals/${timesheetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved: true,
          approvedBy: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Remove the approved timesheet from the list
        setPendingTimesheets(pendingTimesheets.filter((t) => t.id !== timesheetId))
      } else {
        setError(data.message || "Failed to approve timesheet")
      }
    } catch (error) {
      console.error("Error approving timesheet:", error)
      setError(
        "An error occurred while approving the timesheet: " + (error instanceof Error ? error.message : String(error)),
      )
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">Pending Approvals</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  Previous Week
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                  Current Week
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  Next Week
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">
                Week of {weekStartDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => fetchPendingTimesheets(weekStartDate)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-white"
                  onClick={() => fetchPendingTimesheets(weekStartDate)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Try Again
                </Button>
              </div>
            )}

            {timesheetsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p>Loading pending timesheets...</p>
              </div>
            ) : pendingTimesheets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Approvals</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    All timesheets for this week have been approved. You can check other weeks using the navigation
                    buttons above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingTimesheets.map((timesheet) => (
                  <Card key={timesheet.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/20 py-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <CardTitle className="text-lg font-medium">
                          {timesheet.employeeName}
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            {timesheet.employeeType === "salary" ? "Salary" : "Hourly"}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Certified on {new Date(timesheet.submissionDate).toLocaleDateString()}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/timesheet/${timesheet.id}`)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button size="sm" onClick={() => approveTimesheet(timesheet.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Regular Hours</p>
                          <p className="text-xl font-bold">{timesheet.totalRegularHours || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Overtime Hours</p>
                          <p className="text-xl font-bold text-amber-600">{timesheet.totalOvertimeHours || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Double Time Hours</p>
                          <p className="text-xl font-bold text-red-600">{timesheet.totalDoubleTimeHours || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Hours</p>
                          <p className="text-xl font-bold">
                            {(
                              (Number.parseFloat(timesheet.totalRegularHours) || 0) +
                              (Number.parseFloat(timesheet.totalOvertimeHours) || 0) +
                              (Number.parseFloat(timesheet.totalDoubleTimeHours) || 0)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {timesheet.employeeType === "salary" && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-800">
                            Salaried Employee: ${Number.parseFloat(timesheet.weeklySalary).toFixed(2)} per week
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

