"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { getTimesheetById } from "@/lib/timesheet"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, FileEdit } from "lucide-react"

export default function TimesheetDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const timesheetId = params.id as string
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheet, setTimesheet] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Fetch timesheet data
    const fetchTimesheet = async () => {
      try {
        const data = await getTimesheetById(Number.parseInt(timesheetId))
        if (!data) {
          setError("Timesheet not found")
          toast({
            variant: "destructive",
            title: "Error",
            description: "Timesheet not found",
          })
          return
        }

        setTimesheet(data)
      } catch (error) {
        console.error("Error fetching timesheet:", error)
        setError("Error loading timesheet: " + (error instanceof Error ? error.message : String(error)))
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load timesheet",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTimesheet()
  }, [router, timesheetId, toast])

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
          <DashboardNav userRole="employee" />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/employee/timesheets")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Timesheets
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

  // Calculate total hours
  const totalHours = (
    (Number.parseFloat(timesheet.totalRegularHours) || 0) +
    (Number.parseFloat(timesheet.totalOvertimeHours) || 0) +
    (Number.parseFloat(timesheet.totalDoubleTimeHours) || 0)
  ).toFixed(2)

  // Get day names in order
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/employee/timesheets")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Timesheets
                </Button>
                <h1 className="text-3xl font-bold">Timesheet Details</h1>
              </div>

              <div className="flex items-center gap-2">
                {timesheet.status === "draft" && (
                  <Button onClick={() => router.push(`/employee/timesheet/${timesheetId}/edit`)}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Edit Timesheet
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader className="bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <CardTitle>Week of {formattedDate}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(timesheet.status)}
                    {timesheet.submissionDate && (
                      <span className="text-sm text-muted-foreground">
                        {timesheet.status === "certified" ? "Certified" : "Submitted"} on{" "}
                        {new Date(timesheet.submissionDate).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Regular Hours</p>
                      <p className="text-2xl font-bold">{timesheet.totalRegularHours || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overtime Hours (1.5x)</p>
                      <p className="text-2xl font-bold text-amber-600">{timesheet.totalOvertimeHours || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Double Time Hours (2x)</p>
                      <p className="text-2xl font-bold text-red-600">{timesheet.totalDoubleTimeHours || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-2xl font-bold">{totalHours}</p>
                    </div>
                  </div>

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

