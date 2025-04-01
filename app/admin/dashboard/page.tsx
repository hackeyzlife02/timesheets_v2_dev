"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { WeeklySubmissionStats } from "@/components/weekly-submission-stats"
import { EnhancedDebugPanel } from "@/components/enhanced-debug-panel"
import { Loader2, Calendar, Users, ClipboardCheck, Clock } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek())
  const [submissionStats, setSubmissionStats] = useState<any>(null)
  const [employeeStats, setEmployeeStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [employeeStatsLoading, setEmployeeStatsLoading] = useState(true)
  const [debugData, setDebugData] = useState<any>({})

  // Helper function to get the start of the current week (Monday)
  function getStartOfWeek() {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    monday.setHours(0, 0, 0, 0)

    // Log the calculated Monday date for debugging
    console.log("Calculated Monday date:", monday.toISOString())

    return monday
  }

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

    // Fetch submission stats for the current week
    fetchSubmissionStats(weekStartDate)

    // Fetch employee stats
    fetchEmployeeStats()
  }, [router, weekStartDate])

  const fetchSubmissionStats = async (date: Date) => {
    try {
      setStatsLoading(true)
      const formattedDate = formatDate(date)
      const apiUrl = `/api/admin/stats?weekStartDate=${formattedDate}`

      // Debug info
      const debugInfo = {
        apiUrl,
        requestTime: new Date().toISOString(),
      }

      console.log(`Fetching stats for date: ${formattedDate}`)
      console.log(`Date object: ${date.toISOString()}`)

      const startTime = performance.now()
      const response = await fetch(apiUrl)
      const endTime = performance.now()

      debugInfo.responseStatus = response.status
      debugInfo.responseTime = `${(endTime - startTime).toFixed(2)}ms`

      console.log("Stats response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        debugInfo.error = {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        }
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`)
      }

      const data = await response.json()
      debugInfo.responseData = data

      console.log("Stats data:", data)

      if (data.success) {
        setSubmissionStats(data.data)
        debugInfo.parsedData = data.data
      } else {
        debugInfo.error = {
          message: data.message,
          details: data.error,
        }
        console.error("Failed to fetch submission stats:", data.message)
      }

      setDebugData(debugInfo)
    } catch (error) {
      console.error("Error fetching submission stats:", error)
      setDebugData((prev) => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      }))
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchEmployeeStats = async () => {
    try {
      setEmployeeStatsLoading(true)
      const apiUrl = `/api/admin/employees`

      console.log("Fetching employee stats...")

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Employee stats data:", data)

      if (data.success) {
        setEmployeeStats(data.data)
      } else {
        console.error("Failed to fetch employee stats:", data.message)
      }
    } catch (error) {
      console.error("Error fetching employee stats:", error)
    } finally {
      setEmployeeStatsLoading(false)
    }
  }

  // Helper function to format date as YYYY-MM-DD
  function formatDate(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
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

  // Check if the selected week is the current week
  const isCurrentWeek = () => {
    const currentWeekStart = getStartOfWeek()
    return (
      weekStartDate.getFullYear() === currentWeekStart.getFullYear() &&
      weekStartDate.getMonth() === currentWeekStart.getMonth() &&
      weekStartDate.getDate() === currentWeekStart.getDate()
    )
  }

  // Function to manually refresh stats
  const refreshStats = () => {
    fetchSubmissionStats(weekStartDate)
    fetchEmployeeStats()
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
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <Button onClick={refreshStats} variant="outline" size="sm">
                Refresh Data
              </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  Week of{" "}
                  {weekStartDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  Previous Week
                </Button>
                <Button
                  variant={isCurrentWeek() ? "default" : "outline"}
                  size="sm"
                  onClick={goToCurrentWeek}
                  className={
                    isCurrentWeek() ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-50 hover:bg-blue-100 border-blue-200"
                  }
                >
                  Current Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  Next Week
                </Button>
              </div>
            </div>

            {statsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p>Loading submission statistics...</p>
              </div>
            ) : (
              <WeeklySubmissionStats stats={submissionStats} weekStartDate={weekStartDate} />
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />
                    Pending Approvals
                  </CardTitle>
                  <CardDescription>Timesheets awaiting your review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{submissionStats?.pendingApproval || 0}</div>
                  <p className="text-sm text-muted-foreground">
                    {submissionStats?.pendingApproval === 0
                      ? "No pending approvals"
                      : `${submissionStats?.pendingApproval} timesheet(s) need review`}
                  </p>
                  <Button className="mt-4 w-full" onClick={() => router.push("/admin/approvals")}>
                    Review Timesheets
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Active Employees
                  </CardTitle>
                  <CardDescription>Total active employees</CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeStatsLoading ? (
                    <div className="flex justify-center items-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                      <p className="text-sm">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{employeeStats?.activeEmployees || 0}</div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hourly:</span>
                          <span className="font-medium">{employeeStats?.hourlyEmployees || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Salary:</span>
                          <span className="font-medium">{employeeStats?.salaryEmployees || 0}</span>
                        </div>
                      </div>
                      <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/admin/users")}>
                        Manage Users
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Weekly Report
                  </CardTitle>
                  <CardDescription>Current week summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Pending Hours:</div>
                      <div className="text-sm font-medium text-right">
                        {submissionStats?.pendingHours?.toFixed(1) || "0.0"}
                      </div>

                      <div className="text-sm text-muted-foreground">Submitted Hours:</div>
                      <div className="text-sm font-medium text-right text-amber-600">
                        {submissionStats?.submittedHours?.toFixed(1) || "0.0"}
                      </div>

                      <div className="text-sm text-muted-foreground">Approved Hours:</div>
                      <div className="text-sm font-medium text-right text-green-600">
                        {submissionStats?.approvedHours?.toFixed(1) || "0.0"}
                      </div>

                      <div className="text-sm font-semibold border-t pt-1">Total Hours:</div>
                      <div className="text-sm font-bold text-right border-t pt-1">
                        {submissionStats?.totalHours?.toFixed(1) || "0.0"}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/admin/reports")}>
                    Generate Reports
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Debug Panel */}
            <EnhancedDebugPanel
              debugData={debugData}
              selectedWeekStartDate={weekStartDate}
              submissionStats={submissionStats}
              employeeStats={employeeStats}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

