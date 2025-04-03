"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { CalendarPlus, FileText, Clock, Calendar, AlertCircle } from "lucide-react"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null)
  const [currentWeek, setCurrentWeek] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Calculate current week dates client-side
    calculateCurrentWeek()

    // Fetch active timesheet
    fetchActiveTimesheet(currentUser?.id)
  }, [router])

  // Calculate current week dates in the client's timezone
  const calculateCurrentWeek = () => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1 // If Sunday, go back 6 days to previous Monday

    // Calculate Monday (start of week)
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToMonday)
    monday.setHours(0, 0, 0, 0)

    // Calculate Sunday (end of week)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Calculate week number
    const startOfYear = new Date(monday.getFullYear(), 0, 1)
    const days = Math.floor((monday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    setCurrentWeek({
      weekStartDate: monday,
      weekEndDate: sunday,
      weekNumber,
      year: monday.getFullYear(),
    })
  }

  const fetchActiveTimesheet = async (userId: number) => {
    try {
      // Format current date for API query
      const now = new Date()
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1 // If Sunday, go back 6 days to previous Monday

      // Calculate Monday (start of week)
      const monday = new Date(now)
      monday.setDate(now.getDate() - daysToMonday)

      // Format date as YYYY-MM-DD
      const formattedDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`

      // Fetch active timesheet with the formatted date
      const response = await fetch(`/api/timesheets/active?userId=${userId}&date=${formattedDate}`)
      const data = await response.json()

      console.log("Timesheet data received:", data)
      setDebugInfo(data)

      if (data.success && data.timesheet) {
        setActiveTimesheet(data.timesheet)
      }
    } catch (error) {
      console.error("Error fetching active timesheet:", error)
    } finally {
      setLoading(false)
    }
  }

  // Format date for display (e.g., "Mar 31, 2025")
  const formatDisplayDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Format date and time for display (e.g., "Mar 31, 2025, 2:30 PM")
  const formatDisplayDateTime = (dateString: string) => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) return "Invalid Date"

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Calculate total hours from timesheet data
  const calculateTotalHours = (timesheet: any) => {
    if (!timesheet) return "0.00"

    // Log the values to help debug
    console.log("Hours values:", {
      regular: timesheet.total_regular_hours || timesheet.totalRegularHours,
      overtime: timesheet.total_overtime_hours || timesheet.totalOvertimeHours,
      doubleTime: timesheet.total_double_time_hours || timesheet.totalDoubleTimeHours,
    })

    // Try to get values using both camelCase and snake_case keys
    const regularHours = Number(timesheet.total_regular_hours || timesheet.totalRegularHours || 0)
    const overtimeHours = Number(timesheet.total_overtime_hours || timesheet.totalOvertimeHours || 0)
    const doubleTimeHours = Number(timesheet.total_double_time_hours || timesheet.totalDoubleTimeHours || 0)

    const total = regularHours + overtimeHours + doubleTimeHours
    return total.toFixed(2)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>
      case "certified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Certified</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl font-bold">Employee Dashboard</h1>
              <Button onClick={() => router.push("/employee/timesheet/select-week")}>Create New Timesheet</Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Current Week Timesheet</CardTitle>
                  <CardDescription>
                    {currentWeek ? (
                      <>
                        {currentWeek.year}, Week {currentWeek.weekNumber}
                      </>
                    ) : (
                      <>Current week information</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentWeek ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          Week of {formatDisplayDate(currentWeek.weekStartDate)} to{" "}
                          {formatDisplayDate(currentWeek.weekEndDate)}
                        </span>
                      </div>

                      {activeTimesheet ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(activeTimesheet.status)}
                              {activeTimesheet.status === "certified" && (
                                <span className="text-sm text-muted-foreground">Awaiting review</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Updated:</span>
                            <span className="text-sm font-medium">
                              {activeTimesheet.updated_at ? formatDisplayDateTime(activeTimesheet.updated_at) : "N/A"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Hours:</span>
                            <span className="text-sm font-medium">{calculateTotalHours(activeTimesheet)}</span>
                          </div>

                          {activeTimesheet.status === "draft" && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Saved Progress:</span>
                              <span className="text-sm font-medium">
                                {activeTimesheet.completionPercentage
                                  ? `${activeTimesheet.completionPercentage}% complete`
                                  : "In progress"}
                              </span>
                            </div>
                          )}

                          {activeTimesheet.submission_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {activeTimesheet.status === "certified" ? "Certified" : "Submitted"} on:
                              </span>
                              <span className="text-sm font-medium">
                                {formatDisplayDateTime(activeTimesheet.submission_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          <p className="text-sm">No timesheet has been created for this week yet.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Unable to load current week information</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {activeTimesheet ? (
                    <div className="w-full flex flex-col sm:flex-row gap-2">
                      <Button
                        className="flex-1"
                        variant={activeTimesheet.status === "draft" ? "default" : "outline"}
                        onClick={() =>
                          router.push(
                            `/employee/timesheet/${activeTimesheet.id}${activeTimesheet.status === "draft" ? "/edit" : ""}`,
                          )
                        }
                      >
                        {activeTimesheet.status === "draft" ? "Continue Editing" : "View Details"}
                      </Button>
                      {activeTimesheet.status === "certified" && (
                        <Button
                          className="flex-1"
                          variant="outline"
                          onClick={() => router.push(`/employee/timesheet/${activeTimesheet.id}/pdf`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button className="w-full" onClick={() => router.push("/employee/timesheet/select-week")}>
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Create Timesheet
                    </Button>
                  )}
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">My Timesheets</CardTitle>
                  <CardDescription>View and manage your timesheets</CardDescription>
                </CardHeader>
                <CardContent className="h-[120px] flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" onClick={() => router.push("/employee/timesheets")}>
                    View All Timesheets
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Debug info - remove in production */}
            {debugInfo && (
              <div className="mt-8 p-4 border rounded bg-gray-50">
                <h3 className="text-sm font-semibold mb-2">Debug Information:</h3>
                <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

