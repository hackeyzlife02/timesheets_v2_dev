"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { AdminTimesheetSummary } from "@/components/admin-timesheet-summary"

export default function AdminTimesheetDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const timesheetId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheet, setTimesheet] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)

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

    // Fetch timesheet data
    fetchTimesheet()
  }, [router, timesheetId])

  const fetchTimesheet = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/timesheets/${timesheetId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Timesheet data:", data)

      if (data.success) {
        // Add default values for admin approval fields if they don't exist
        const timesheetData = {
          ...data.data,
          adminApproved: data.data.adminApproved || false,
          approvalDate: data.data.approvalDate || null,
          approvedBy: data.data.approvedBy || null,
        }
        setTimesheet(timesheetData)
      } else {
        setError(data.message || "Failed to fetch timesheet")
      }
    } catch (error) {
      console.error("Error fetching timesheet:", error)
      setError(
        "An error occurred while fetching the timesheet: " + (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setLoading(false)
    }
  }

  const approveTimesheet = async () => {
    try {
      setApproving(true)

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
        // Update the timesheet data to reflect approval
        setTimesheet({
          ...timesheet,
          adminApproved: true,
          approvalDate: new Date().toISOString(),
          approvedBy: user.id,
        })
      } else {
        setError(data.message || "Failed to approve timesheet")
      }
    } catch (error) {
      console.error("Error approving timesheet:", error)
      setError(
        "An error occurred while approving the timesheet: " + (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="admin" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading timesheet...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !timesheet) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="admin" />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/approvals")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Approvals
                </Button>
              </div>

              <Alert variant="destructive">
                <AlertDescription>{error || "Timesheet not found"}</AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Format date for display
  const weekStartDate = new Date(timesheet.weekStartDate)
  const formattedDate = weekStartDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Get day names in order
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/approvals")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Approvals
                </Button>
                <h1 className="text-3xl font-bold">Timesheet Review</h1>
              </div>

              <div className="flex items-center gap-2">
                {!timesheet.adminApproved ? (
                  <Button onClick={approveTimesheet} disabled={approving}>
                    {approving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Timesheet
                      </>
                    )}
                  </Button>
                ) : (
                  <Badge className="bg-green-100 text-green-800 px-3 py-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approved
                  </Badge>
                )}
              </div>
            </div>

            <Card>
              <CardHeader className="bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">
                      {timesheet.employeeName}
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        {timesheet.employeeType === "salary" ? "Salary" : "Hourly"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{timesheet.employeeEmail}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-medium">Week of {formattedDate}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        Certified on {new Date(timesheet.submissionDate).toLocaleDateString()}
                      </Badge>
                      {timesheet.adminApproved && (
                        <Badge variant="outline" className="bg-green-50">
                          Approved on {new Date(timesheet.approvalDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <AdminTimesheetSummary
                    regularHours={Number.parseFloat(timesheet.totalRegularHours) || 0}
                    overtimeHours={Number.parseFloat(timesheet.totalOvertimeHours) || 0}
                    doubleTimeHours={Number.parseFloat(timesheet.totalDoubleTimeHours) || 0}
                    employeeType={timesheet.employeeType}
                    weeklySalary={Number.parseFloat(timesheet.weeklySalary) || 0}
                  />

                  <h2 className="text-xl font-semibold mt-6 mb-4">Daily Breakdown</h2>

                  <div className="space-y-4">
                    {dayOrder.map((dayName) => {
                      const day = timesheet.days[dayName]
                      if (!day) return null

                      return (
                        <Card key={dayName} className="overflow-hidden">
                          <CardHeader className="bg-muted/10 py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-medium capitalize">
                                {dayName}
                                {day.isSeventhConsecutiveDay && (
                                  <span className="ml-2 text-sm text-amber-600 font-normal">(7th Consecutive Day)</span>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-4">
                                {day.didNotWork ? (
                                  <Badge variant="outline">Did Not Work</Badge>
                                ) : (
                                  <>
                                    {day.totalRegularHours > 0 && (
                                      <span className="text-sm font-medium">{day.totalRegularHours} hrs</span>
                                    )}
                                    {day.totalOvertimeHours > 0 && (
                                      <span className="text-sm font-medium text-amber-600">
                                        +{day.totalOvertimeHours} OT
                                      </span>
                                    )}
                                    {day.totalDoubleTimeHours > 0 && (
                                      <span className="text-sm font-medium text-red-600">
                                        +{day.totalDoubleTimeHours} DT
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {day.didNotWork ? (
                              <div>
                                {day.reasons && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Reason:</p>
                                    <p className="text-sm text-muted-foreground">{day.reasons}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Time In:</p>
                                    <p className="text-sm">{day.timeIn || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Time Out:</p>
                                    <p className="text-sm">{day.timeOut || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Meal Break:</p>
                                    <p className="text-sm">
                                      {day.mealBreakStart && day.mealBreakEnd
                                        ? `${day.mealBreakStart} - ${day.mealBreakEnd}`
                                        : "N/A"}
                                    </p>
                                  </div>
                                  {(day.outOfTownHours > 0 || day.outOfTownMinutes > 0) && (
                                    <div>
                                      <p className="text-sm font-medium">Out of Town:</p>
                                      <p className="text-sm">
                                        {day.outOfTownHours > 0 ? `${day.outOfTownHours}h ` : ""}
                                        {day.outOfTownMinutes > 0 ? `${day.outOfTownMinutes}m` : ""}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">AM Break:</p>
                                    <p className="text-sm">
                                      {day.amBreakStart && day.amBreakEnd
                                        ? `${day.amBreakStart} - ${day.amBreakEnd}`
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">PM Break:</p>
                                    <p className="text-sm">
                                      {day.pmBreakStart && day.pmBreakEnd
                                        ? `${day.pmBreakStart} - ${day.pmBreakEnd}`
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>

                                {day.reasons && (
                                  <div>
                                    <p className="text-sm font-medium">Notes:</p>
                                    <p className="text-sm text-muted-foreground">{day.reasons}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

