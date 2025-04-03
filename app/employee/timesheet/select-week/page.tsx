"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, addWeeks, subWeeks, startOfWeek, isSameDay } from "date-fns"
import { CheckCircle, AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { createTimesheet } from "@/lib/actions"
import { cn } from "@/lib/utils"

// Helper function to get Monday of a given week
function getMondayOfWeek(date: Date): Date {
  // Use date-fns to get the start of week (Monday)
  return startOfWeek(date, { weekStartsOn: 1 })
}

// Helper function to format date as "Monday, April 7, 2025"
function formatDateLong(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy")
}

// Helper function to format date as "Apr 7 - Apr 13, 2025"
function formatWeekRange(startDate: Date): string {
  const endDate = addWeeks(startDate, 1)
  endDate.setDate(endDate.getDate() - 1) // End date is Sunday

  // If start and end dates are in the same month and year
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
  }

  // If start and end dates are in the same year but different months
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
  }

  // If start and end dates are in different years
  return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  // Create a new date object for the first day of the year
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)

  // Calculate the difference in days between the given date and the first day of the year
  const daysSinceFirstDay = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000))

  // Calculate the week number
  return Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7)
}

export default function SelectWeekPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [existingTimesheets, setExistingTimesheets] = useState<any[]>([])
  const [weeks, setWeeks] = useState<{ date: Date; hasTimesheet: boolean; isCurrent: boolean }[]>([])
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Fetch user's existing timesheets
    fetchTimesheets(currentUser?.id)
  }, [router])

  const fetchTimesheets = async (userId: number) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/timesheets?userId=${userId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setExistingTimesheets(data.data || [])
      } else {
        console.error("Failed to fetch timesheets:", data.message)
        setExistingTimesheets([])
      }

      // Generate weeks after fetching timesheets
      generateWeeks(data.data || [])
    } catch (error) {
      console.error("Error fetching timesheets:", error)
      setExistingTimesheets([])
      // Still generate weeks even if there's an error
      generateWeeks([])
    } finally {
      setLoading(false)
    }
  }

  const generateWeeks = (timesheets: any[]) => {
    // Get current date and find Monday of current week
    const today = new Date()
    const currentMonday = getMondayOfWeek(today)

    // Generate 12 weeks (current week + 11 previous weeks)
    const weeksList = []

    for (let i = 0; i < 12; i++) {
      // Calculate the Monday for this week
      const weekMonday = subWeeks(currentMonday, i)

      // Check if a timesheet exists for this week
      const hasTimesheet = timesheets.some((timesheet) => {
        const timesheetDate = new Date(timesheet.weekStartDate)
        return isSameDay(timesheetDate, weekMonday)
      })

      weeksList.push({
        date: weekMonday,
        hasTimesheet,
        isCurrent: i === 0,
      })
    }

    setWeeks(weeksList)

    // Select the current week by default
    setSelectedWeek(currentMonday)
  }

  const handleWeekSelect = (date: Date) => {
    setSelectedWeek(date)
  }

  const handleCreateTimesheet = async () => {
    if (!selectedWeek) {
      setError("Please select a week")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Set time to noon to avoid timezone issues
      const selectedDate = new Date(
        selectedWeek.getFullYear(),
        selectedWeek.getMonth(),
        selectedWeek.getDate(),
        12,
        0,
        0,
      )

      const result = await createTimesheet(selectedDate.toISOString())

      if (result.success && result.id) {
        router.push(`/employee/timesheet/${result.id}/edit`)
      } else {
        setError(result.error || "Failed to create timesheet")
      }
    } catch (error) {
      console.error("Error creating timesheet:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="employee" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2">Loading weeks...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Select Week</h1>
              <p className="text-muted-foreground mt-1">Choose the week you want to create a timesheet for</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Current Week</CardTitle>
                <CardDescription>The current week is highlighted below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeks.map((week) => (
                    <div
                      key={week.date.toISOString()}
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-colors",
                        selectedWeek && isSameDay(selectedWeek, week.date)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                        week.isCurrent && !week.hasTimesheet && "border-blue-500",
                        !week.isCurrent && !week.hasTimesheet && "border-amber-500",
                      )}
                      onClick={() => !week.hasTimesheet && handleWeekSelect(week.date)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Week {getWeekNumber(week.date)}</span>
                            {week.isCurrent && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Current</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{formatWeekRange(week.date)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Starting: {formatDateLong(week.date)}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {week.hasTimesheet ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-5 w-5 mr-1" />
                              <span className="text-sm">Timesheet exists</span>
                            </div>
                          ) : selectedWeek && isSameDay(selectedWeek, week.date) ? (
                            <ChevronRight className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="text-sm text-muted-foreground">Available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => router.push("/employee/timesheets")}>
                  View My Timesheets
                </Button>
                <Button
                  onClick={handleCreateTimesheet}
                  disabled={
                    !selectedWeek ||
                    isCreating ||
                    weeks.find((w) => selectedWeek && isSameDay(w.date, selectedWeek))?.hasTimesheet
                  }
                >
                  {isCreating ? "Creating..." : "Create Timesheet"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

