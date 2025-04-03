"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { getTimesheetById, type DayEntry } from "@/lib/timesheet"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeftIcon, ClipboardCheckIcon } from "lucide-react"

// Helper function to check if a day is a weekend
function isWeekend(dayName: string): boolean {
  const day = dayName.toLowerCase()
  return day === "saturday" || day === "sunday"
}

// Helper function to format time (e.g., "08:00" to "8:00 AM")
function formatTime(time: string): string {
  if (!time) return "N/A"

  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const formattedHour = hour % 12 || 12

  return `${formattedHour}:${minutes} ${ampm}`
}

export default function ReviewTimesheet() {
  const router = useRouter()
  const params = useParams()
  const timesheetId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timesheet, setTimesheet] = useState<any>(null)
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date())
  const [weekDays, setWeekDays] = useState<any[]>([])
  const [timesheetData, setTimesheetData] = useState<{ [key: string]: DayEntry }>({})
  const [isCertified, setIsCertified] = useState(false)
  const [editingComments, setEditingComments] = useState<{ [key: string]: boolean }>({})

  const { toast } = useToast()

  // Helper function to get day name
  function getDayName(date: Date) {
    return date.toLocaleDateString("en-US", { weekday: "long" })
  }

  // Generate array of days for the week
  function getWeekDays(startDate: Date) {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push({
        date: day,
        name: getDayName(day),
        formattedDate: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      })
    }
    return days
  }

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
          toast({
            variant: "destructive",
            title: "Error",
            description: "Timesheet not found",
          })
          router.push("/employee/dashboard")
          return
        }

        setTimesheet(data)

        // Set week start date
        const startDate = new Date(data.weekStartDate)
        setWeekStartDate(startDate)

        // Initialize week days
        const days = getWeekDays(startDate)
        setWeekDays(days)

        // Initialize timesheet data from fetched data
        if (data.days) {
          setTimesheetData(data.days)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching timesheet:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error loading timesheet",
        })
        router.push("/employee/dashboard")
      }
    }

    fetchTimesheet()
  }, [router, timesheetId, toast])

  // Toggle editing comments for a specific day
  const toggleEditComments = (day: string) => {
    setEditingComments((prev) => ({
      ...prev,
      [day.toLowerCase()]: !prev[day.toLowerCase()],
    }))
  }

  // Handle comment change for a specific day
  const handleCommentChange = (day: string, value: string) => {
    setTimesheetData((prev) => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        reasons: value,
      },
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isCertified) {
      toast({
        variant: "destructive",
        title: "Certification Required",
        description: "Please certify your timesheet before submitting.",
      })
      return
    }

    setSubmitting(true)

    try {
      // Prepare the data for submission
      const timesheetSubmission = {
        id: Number.parseInt(timesheetId),
        userId: user?.id,
        weekStartDate: weekStartDate.toISOString(),
        status: "certified",
        certified: true,
        days: timesheetData,
        totalRegularHours: timesheet.totalRegularHours,
        totalOvertimeHours: timesheet.totalOvertimeHours,
        totalDoubleTimeHours: timesheet.totalDoubleTimeHours,
      }

      // Send the data to the API
      const response = await fetch(`/api/timesheets/${timesheetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timesheetSubmission),
      })

      const result = await response.json()

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to submit timesheet",
        })
        return
      }

      // Show success message
      toast({
        title: "Success",
        description: "Timesheet submitted successfully!",
        variant: "success",
      })

      // Redirect to timesheets list
      router.push("/employee/timesheets")
    } catch (error) {
      console.error("Error submitting timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while submitting the timesheet. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading timesheet...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Review Timesheet</h1>
                <p className="text-muted-foreground">Week Starting: {weekStartDate.toLocaleDateString()}</p>
              </div>
              <Button variant="outline" onClick={() => router.push(`/employee/timesheet/${timesheetId}/edit`)}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Edit
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Regular Hours</p>
                  <p className="text-2xl font-bold">{timesheet.totalRegularHours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overtime Hours (1.5x)</p>
                  <p className="text-2xl font-bold text-amber-600">{timesheet.totalOvertimeHours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Double Time Hours (2x)</p>
                  <p className="text-2xl font-bold text-red-600">{timesheet.totalDoubleTimeHours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {(
                      (Number(timesheet.totalRegularHours) || 0) +
                      (Number(timesheet.totalOvertimeHours) || 0) +
                      (Number(timesheet.totalDoubleTimeHours) || 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Daily Summary</h2>

                {weekDays.map((day) => {
                  const dayData = timesheetData[day.name.toLowerCase()]
                  if (!dayData) return null

                  return (
                    <Card key={day.name} className="overflow-hidden">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium">
                            {day.name} ({day.formattedDate})
                            {dayData.isSeventhConsecutiveDay && (
                              <span className="ml-2 text-sm text-amber-600 font-normal">(7th Consecutive Day)</span>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {dayData.didNotWork ? (
                              <span className="text-sm text-muted-foreground">Did not work</span>
                            ) : (
                              <>
                                {dayData.totalRegularHours > 0 && (
                                  <span className="text-sm font-medium">{dayData.totalRegularHours} hrs</span>
                                )}
                                {dayData.totalOvertimeHours > 0 && (
                                  <span className="text-sm font-medium text-amber-600">
                                    +{dayData.totalOvertimeHours} OT
                                  </span>
                                )}
                                {dayData.totalDoubleTimeHours > 0 && (
                                  <span className="text-sm font-medium text-red-600">
                                    +{dayData.totalDoubleTimeHours} DT
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        {!dayData.didNotWork ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Time In</p>
                                  <p className="font-medium">{formatTime(dayData.timeIn)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Time Out</p>
                                  <p className="font-medium">{formatTime(dayData.timeOut)}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Meal Break</p>
                                  <p className="font-medium">
                                    {dayData.mealBreakStart && dayData.mealBreakEnd
                                      ? `${formatTime(dayData.mealBreakStart)} - ${formatTime(dayData.mealBreakEnd)}`
                                      : "None"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Out of Town</p>
                                  <p className="font-medium">
                                    {dayData.outOfTownHours > 0 || dayData.outOfTownMinutes > 0
                                      ? `${dayData.outOfTownHours}h ${dayData.outOfTownMinutes}m`
                                      : "None"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">Comments</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleEditComments(day.name)}
                                >
                                  {editingComments[day.name.toLowerCase()] ? "Done" : "Edit"}
                                </Button>
                              </div>

                              {editingComments[day.name.toLowerCase()] ? (
                                <Textarea
                                  value={dayData.reasons || ""}
                                  onChange={(e) => handleCommentChange(day.name, e.target.value)}
                                  placeholder="Enter any additional information here..."
                                  className="h-24"
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground border rounded-md p-2 min-h-[60px] bg-muted/20">
                                  {dayData.reasons || "No comments provided."}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">Reason for not working</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEditComments(day.name)}
                              >
                                {editingComments[day.name.toLowerCase()] ? "Done" : "Edit"}
                              </Button>
                            </div>

                            {editingComments[day.name.toLowerCase()] ? (
                              <Textarea
                                value={dayData.reasons || ""}
                                onChange={(e) => handleCommentChange(day.name, e.target.value)}
                                placeholder="Enter reason for not working..."
                                className="h-24"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground border rounded-md p-2 min-h-[60px] bg-muted/20">
                                {dayData.reasons || "No reason provided."}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Certification</CardTitle>
                  <CardDescription>Please review your timesheet carefully before submitting.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="certify-checkbox"
                        checked={isCertified}
                        onCheckedChange={(checked) => setIsCertified(checked === true)}
                        className="mt-1"
                      />
                      <Label htmlFor="certify-checkbox" className="text-sm">
                        I certify that the hours reported in this timesheet are true and complete to the best of my
                        knowledge, and I have not falsified or omitted any work hours. I understand that any
                        misrepresentation may result in disciplinary action and legal consequences in accordance with
                        applicable San Francisco and California labor laws.
                      </Label>
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/employee/timesheet/${timesheetId}/edit`)}
                      >
                        Back to Edit
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isCertified || submitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ClipboardCheckIcon className="mr-2 h-4 w-4" />
                        {submitting ? "Submitting..." : "Submit Timesheet"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

