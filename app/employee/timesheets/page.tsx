"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Loader2, RefreshCw } from "lucide-react"

export default function TimesheetsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      console.log("User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    console.log("Current user in timesheets page:", currentUser)

    if (!currentUser) {
      console.log("No current user found, redirecting to login")
      router.push("/login")
      return
    }

    setUser(currentUser)

    // Fetch timesheets
    fetchTimesheets(currentUser.id)
  }, [router])

  const fetchTimesheets = async (userId: number) => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)

      console.log(`Fetching timesheets for user ID: ${userId}`)

      if (!userId) {
        throw new Error("User ID is required to fetch timesheets")
      }

      const response = await fetch(`/api/timesheets?userId=${userId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Add debug info
      setDebugInfo(JSON.stringify(data, null, 2))

      if (data.success) {
        // Ensure we always have an array
        if (Array.isArray(data.data)) {
          setTimesheets(data.data)
          console.log(`Loaded ${data.data.length} timesheets`)
        } else {
          console.error("data.data is not an array:", data.data)
          setTimesheets([])
          setError("Received invalid data format from server")
        }
      } else {
        setError(data.message || "Failed to fetch timesheets")
        setTimesheets([])
      }
    } catch (error) {
      console.error("Error fetching timesheets:", error)
      setError(
        "An error occurred while fetching timesheets: " + (error instanceof Error ? error.message : String(error)),
      )
      setTimesheets([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>
      case "certified":
        return (
          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
            Certified
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="employee" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading timesheets...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Ensure timesheets is always an array
  const timesheetsArray = Array.isArray(timesheets) ? timesheets : []

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl font-bold">My Timesheets</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchTimesheets(user?.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={() => router.push("/employee/timesheet/new")}>Create New Timesheet</Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
                <Button variant="outline" size="sm" className="mt-2 bg-white" onClick={() => fetchTimesheets(user?.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}

            {debugInfo && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded relative">
                <details>
                  <summary className="cursor-pointer">Debug Information</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40">{debugInfo}</pre>
                </details>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>All Timesheets</CardTitle>
              </CardHeader>
              <CardContent>
                {timesheetsArray.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>
                      No timesheets found. Create your first timesheet by clicking the "Create New Timesheet" button.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => fetchTimesheets(user?.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Timesheets List
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timesheetsArray.map((timesheet) => (
                      <Card key={timesheet.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/20 py-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <CardTitle className="text-lg font-medium">
                              Week of {new Date(timesheet.weekStartDate).toLocaleDateString()}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(timesheet.status)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/employee/timesheet/${timesheet.id}`)}
                              >
                                View Details
                              </Button>
                              {timesheet.status === "draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => router.push(`/employee/timesheet/${timesheet.id}/edit`)}
                                >
                                  Continue Editing
                                </Button>
                              )}
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
                          {timesheet.submissionDate && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              {timesheet.status === "certified" ? "Certified" : "Submitted"} on{" "}
                              {new Date(timesheet.submissionDate).toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

