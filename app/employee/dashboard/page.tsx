"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Loader2, Clock, FileEdit, AlertCircle } from "lucide-react"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null)
  const [pendingTimesheets, setPendingTimesheets] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      console.log("User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    console.log("Current user in employee dashboard:", currentUser)

    // If user is admin, redirect to admin dashboard
    if (currentUser && currentUser.isAdmin) {
      console.log("User is admin, redirecting to admin dashboard")
      router.push("/admin/dashboard")
      return
    }

    setUser(currentUser)

    // Fetch timesheets
    const fetchTimesheets = async () => {
      try {
        console.log("Fetching timesheets for user:", currentUser?.id)
        const response = await fetch(`/api/timesheets?userId=${currentUser?.id}`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Timesheets response:", data)

        if (!data.success) {
          console.error("Error fetching timesheets:", data.message)
          setError(data.message || "Failed to fetch timesheets")
          setLoading(false)
          return
        }

        const timesheets = data.data || []

        // Find active timesheet (draft for current week)
        const now = new Date()
        // Calculate days to subtract to get to Monday
        const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtract = day === 0 ? 6 : day - 1
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - daysToSubtract)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)

        console.log(`Looking for timesheets between ${startOfWeek.toISOString()} and ${endOfWeek.toISOString()}`)

        // Find active timesheet (any drafts)
        const active = timesheets.find((t: any) => {
          // First check if it's a draft
          return t.status === "draft"
        })
        console.log("Active timesheet found:", active)
        setActiveTimesheet(active || null)

        // Find pending timesheets (submitted but not certified)
        const pending = timesheets.filter((t: any) => t.status === "submitted")
        setPendingTimesheets(pending)

        // Get recent activity
        const recent = [...timesheets]
          .sort((a: any, b: any) => {
            const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0)
            const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0)
            return dateB.getTime() - dateA.getTime()
          })
          .slice(0, 3)

        setRecentActivity(recent)
      } catch (error) {
        console.error("Error fetching timesheets:", error)
        setError("Failed to fetch timesheets: " + (error instanceof Error ? error.message : String(error)))
      } finally {
        setLoading(false)
      }
    }

    fetchTimesheets()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="employee" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Format the week start date for display
  const formatWeekDate = (date: string) => {
    try {
      // Parse the date string into a Date object
      const weekStart = new Date(date)
      console.log("Original week start date:", weekStart.toISOString())

      // Ensure we're working with Monday as the first day
      const dayOfWeek = weekStart.getDay() // 0 = Sunday, 1 = Monday, etc.
      console.log("Day of week for start date:", dayOfWeek)

      // If the start date is not Monday (1), adjust it
      if (dayOfWeek !== 1) {
        // If it's Sunday (0), add 1 day to get to Monday
        // For any other day, add days to get to the next Monday
        const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
        weekStart.setDate(weekStart.getDate() + daysToAdd)
        console.log("Adjusted to Monday:", weekStart.toISOString())
      }

      // Calculate the end of the week (Sunday)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // Add 6 days to get to Sunday
      console.log("Week end date:", weekEnd.toISOString())

      // Format dates as MM/DD/YYYY
      const formatDate = (d: Date) => {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
      }

      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
    } catch (error) {
      console.error("Error formatting date:", error)
      return date || "Unknown date"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Employee Dashboard</h1>

            {activeTimesheet && (
              <Alert className="bg-blue-100 border-blue-300 text-blue-900 shadow-sm mb-6">
                <Clock className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900 text-lg font-bold">Active Timesheet Available</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                  <div>
                    <p className="font-medium">
                      You have an active timesheet draft for the week of{" "}
                      <strong>{formatWeekDate(activeTimesheet.weekStartDate)}</strong>
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Continue working on your timesheet to submit your hours.
                    </p>
                  </div>
                  <Button
                    className="mt-3 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
                    onClick={() => router.push(`/employee/timesheet/${activeTimesheet.id}/edit`)}
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Continue Editing
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!activeTimesheet && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800 shadow-sm mb-6">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-800 text-lg font-bold">No Active Timesheet</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                  <div>
                    <p className="font-medium">You don't have an active timesheet for the current week.</p>
                    <p className="text-sm text-amber-700 mt-1">Create a new timesheet to record your hours.</p>
                  </div>
                  <Button
                    className="mt-3 md:mt-0 bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2"
                    onClick={() => router.push("/employee/timesheet/new")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Create New Timesheet
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Current Timesheet</CardTitle>
                  <CardDescription>This week's timesheet status</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeTimesheet ? (
                    <div>
                      <div className="text-2xl font-bold">{formatWeekDate(activeTimesheet.weekStartDate)}</div>
                      <p className="text-sm text-muted-foreground">Draft in progress</p>
                      <Button
                        className="mt-4 w-full"
                        onClick={() => router.push(`/employee/timesheet/${activeTimesheet.id}/edit`)}
                      >
                        Continue Editing
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold">No Active Timesheet</div>
                      <p className="text-sm text-muted-foreground">Start a new timesheet for this week</p>
                      <Button className="mt-4 w-full" onClick={() => router.push("/employee/timesheet/new")}>
                        Create New Timesheet
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Pending Submissions</CardTitle>
                  <CardDescription>Timesheets awaiting certification</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTimesheets.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {pendingTimesheets.length === 0
                      ? "No pending submissions"
                      : `${pendingTimesheets.length} timesheet(s) need certification`}
                  </p>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/employee/timesheets")}>
                    View All Timesheets
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest timesheet submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div>
                      <div className="text-2xl font-bold">No Activity</div>
                      <p className="text-sm text-muted-foreground">You haven't submitted any timesheets yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.map((timesheet) => (
                        <div key={timesheet.id} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{new Date(timesheet.weekStartDate).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/employee/timesheet/${timesheet.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

