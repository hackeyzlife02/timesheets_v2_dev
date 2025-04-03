"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import {
  calculateDayHours,
  calculateBreakDuration,
  validateBreakTimes,
  getTimesheetById,
  type DayEntry,
} from "@/lib/timesheet"
import { useToast } from "@/hooks/use-toast"
import { BreakTimeEntry } from "@/components/break-time-entry"
import { SaveIcon, CheckCircleIcon, XCircleIcon } from "lucide-react"

// Import the WeeklyTotalsBanner component at the top of the file
import { WeeklyTotalsBanner } from "@/components/weekly-totals-banner"

// Helper function to check if a day is a weekend
function isWeekend(dayName: string): boolean {
  const day = dayName.toLowerCase()
  return day === "saturday" || day === "sunday"
}

// Default time values
const DEFAULT_TIME_IN = "08:00" // 8:00 AM
const DEFAULT_TIME_OUT = "16:30" // 4:30 PM
const DEFAULT_MEAL_BREAK_START = "12:00" // 12:00 PM
const DEFAULT_MEAL_BREAK_END = "12:30" // 12:30 PM
const DEFAULT_AM_BREAK_START = "10:00" // 10:00 AM
const DEFAULT_AM_BREAK_END = "10:10" // 10:10 AM
const DEFAULT_PM_BREAK_START = "15:00" // 3:00 PM
const DEFAULT_PM_BREAK_END = "15:10" // 3:10 PM

export default function EditTimesheet() {
  const router = useRouter()
  const params = useParams()
  const timesheetId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheet, setTimesheet] = useState<any>(null)
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date())
  const [weekDays, setWeekDays] = useState<any[]>([])
  const [timesheetData, setTimesheetData] = useState<{ [key: string]: DayEntry }>({})
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({})
  const [weeklyTotals, setWeeklyTotals] = useState({
    regular: 0,
    overtime: 0,
    doubleTime: 0,
    total: 0,
    daysWorked: 0,
  })
  const [calculatedHours, setCalculatedHours] = useState<{
    [key: string]: {
      regular: number
      overtime: number
      doubleTime: number
    }
  }>({})

  const { toast } = useToast()

  // Add a new state to track which days have visible comments
  const [visibleComments, setVisibleComments] = useState<{ [key: string]: boolean }>({})

  // Add a new state to track saving status
  const [isSaving, setIsSaving] = useState(false)

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
          alert("Timesheet not found")
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
        } else {
          // If no days data, initialize with defaults
          const initialData: { [key: string]: DayEntry } = {}
          days.forEach((day) => {
            const dayName = day.name.toLowerCase()
            const isWeekendDay = isWeekend(dayName)

            initialData[dayName] = {
              didNotWork: isWeekendDay,
              timeIn: isWeekendDay ? "" : DEFAULT_TIME_IN,
              mealBreakStart: isWeekendDay ? "" : DEFAULT_MEAL_BREAK_START,
              mealBreakEnd: isWeekendDay ? "" : DEFAULT_MEAL_BREAK_END,
              timeOut: isWeekendDay ? "" : DEFAULT_TIME_OUT,
              amBreakStart: isWeekendDay ? "" : DEFAULT_AM_BREAK_START,
              amBreakEnd: isWeekendDay ? "" : DEFAULT_AM_BREAK_END,
              pmBreakStart: isWeekendDay ? "" : DEFAULT_PM_BREAK_START,
              pmBreakEnd: isWeekendDay ? "" : DEFAULT_PM_BREAK_END,
              outOfTownHours: 0,
              outOfTownMinutes: 0,
              reasons: "",
              totalRegularHours: 0,
              totalOvertimeHours: 0,
              totalDoubleTimeHours: 0,
              isSeventhConsecutiveDay: false,
            }
          })
          setTimesheetData(initialData)
        }

        // Expand the first weekday by default
        if (days.length > 0) {
          setExpandedDay(days[0].name)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching timesheet:", error)
        alert("Error loading timesheet")
        router.push("/employee/dashboard")
      }
    }

    fetchTimesheet()
  }, [router, timesheetId])

  // Calculate weekly totals whenever timesheet data changes
  useEffect(() => {
    if (Object.keys(timesheetData).length === 0) return

    // Track consecutive work days
    let consecutiveWorkDays = 0
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    // Calculate consecutive work days for each day
    const dayConsecutiveCounts: { [key: string]: number } = {}
    const isSeventhDay: { [key: string]: boolean } = {}

    // Count days worked
    let daysWorkedCount = 0

    for (const dayName of dayOrder) {
      const day = timesheetData[dayName]
      if (day && !day.didNotWork && day.timeIn && day.timeOut) {
        consecutiveWorkDays++
        daysWorkedCount++ // Increment days worked count
      } else {
        consecutiveWorkDays = 0
      }

      dayConsecutiveCounts[dayName] = consecutiveWorkDays
      isSeventhDay[dayName] = consecutiveWorkDays >= 7
    }

    // Calculate hours with consecutive day information
    let totalRegular = 0
    let totalOvertime = 0
    let totalDoubleTime = 0

    const dayHours: { [key: string]: { regular: number; overtime: number; doubleTime: number } } = {}

    for (const dayName of dayOrder) {
      const day = timesheetData[dayName]
      if (day && !day.didNotWork && day.timeIn && day.timeOut) {
        const isSeventhConsecutiveDay = isSeventhDay[dayName]
        const { regular, overtime, doubleTime } = calculateDayHours(
          {
            ...day,
            isSeventhConsecutiveDay,
          },
          dayConsecutiveCounts[dayName] - 1,
        )

        // Store day totals without updating state
        dayHours[dayName] = { regular, overtime, doubleTime }

        // Add to weekly totals
        totalRegular += regular
        totalOvertime += overtime
        totalDoubleTime += doubleTime
      } else {
        dayHours[dayName] = { regular: 0, overtime: 0, doubleTime: 0 }
      }
    }

    // Update calculated hours
    setCalculatedHours(dayHours)

    // Update weekly totals without updating timesheetData
    setWeeklyTotals({
      regular: Number.parseFloat(totalRegular.toFixed(2)),
      overtime: Number.parseFloat(totalOvertime.toFixed(2)),
      doubleTime: Number.parseFloat(totalDoubleTime.toFixed(2)),
      total: Number.parseFloat((totalRegular + totalOvertime + totalDoubleTime).toFixed(2)),
      daysWorked: daysWorkedCount, // Add days worked to weekly totals
    })

    // Validate each day's entries
    const errors: { [key: string]: string[] } = {}
    for (const dayName of dayOrder) {
      const { valid, errors: dayErrors } = validateBreakTimes(timesheetData[dayName])
      if (!valid) {
        errors[dayName] = dayErrors
      }
    }
    setValidationErrors(errors)
  }, [timesheetData])

  // Handle input change for a specific day
  const handleDayInputChange = (day: string, field: string, value: string | boolean | number) => {
    setTimesheetData((prev) => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value,
      },
    }))
  }

  // Toggle day expansion
  const toggleDayExpansion = (day: string) => {
    setExpandedDay(expandedDay === day ? null : day)
  }

  // Calculate break duration in minutes
  const getBreakDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0
    const duration = calculateBreakDuration(startTime, endTime)
    // Remove the multiplication by 60 since calculateBreakDuration already returns minutes
    return duration
  }

  // Check if a reason is required for not working
  const isReasonRequiredForNotWorking = (dayName: string): boolean => {
    return !isWeekend(dayName) // Only require reason for weekdays
  }

  // Check if a reason is required for this day
  const isReasonRequired = (dayName: string): boolean => {
    const dayData = timesheetData[dayName.toLowerCase()]
    const dayHours = calculatedHours[dayName.toLowerCase()]

    if (!dayData) return false

    // Require reason if:
    // 1. Not working on a weekday
    // 2. Working on a weekend (all weekend work is overtime)
    // 3. Has overtime or double time hours
    return (
      (dayData.didNotWork && isReasonRequiredForNotWorking(dayName)) ||
      (!dayData.didNotWork && isWeekend(dayName)) ||
      (dayHours && (dayHours.overtime > 0 || dayHours.doubleTime > 0))
    )
  }

  // Add a function to toggle comment visibility for a specific day
  const toggleCommentVisibility = (day: string) => {
    setVisibleComments((prev) => ({
      ...prev,
      [day.toLowerCase()]: !prev[day.toLowerCase()],
    }))
  }

  // Add a function to save progress without submitting the form
  const saveProgress = async () => {
    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the validation errors before saving.",
      })
      return
    }

    setIsSaving(true)

    // Create a copy of timesheet data with calculated hours
    const submissionData = Object.entries(timesheetData).reduce(
      (acc, [dayName, dayData]) => {
        acc[dayName] = {
          ...dayData,
          totalRegularHours: calculatedHours[dayName]?.regular || 0,
          totalOvertimeHours: calculatedHours[dayName]?.overtime || 0,
          totalDoubleTimeHours: calculatedHours[dayName]?.doubleTime || 0,
          isSeventhConsecutiveDay: dayData.isSeventhConsecutiveDay,
        }
        return acc
      },
      {} as { [key: string]: DayEntry },
    )

    try {
      // Prepare the data for submission
      const timesheetSubmission = {
        id: Number.parseInt(timesheetId),
        userId: user?.id,
        weekStartDate: weekStartDate.toISOString(),
        status: "draft", // Always save as draft
        certified: false, // Not certified when saving progress
        days: submissionData,
        totalRegularHours: weeklyTotals.regular,
        totalOvertimeHours: weeklyTotals.overtime,
        totalDoubleTimeHours: weeklyTotals.doubleTime,
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
          description: result.message || "Failed to save progress",
        })
        return
      }

      // Show success message
      toast({
        title: "Success",
        description: "Progress saved successfully.",
      })
    } catch (error) {
      console.error("Error saving progress:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving progress. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Function to proceed to review page
  const proceedToReview = () => {
    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the validation errors before submitting for approval.",
      })
      return
    }

    // Save progress first, then redirect to review page
    saveProgress().then(() => {
      router.push(`/employee/timesheet/${timesheetId}/review`)
    })
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading timesheet...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="employee" />

        <main className="flex-1 p-6 pb-16">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Edit Timesheet</h1>
                <p className="text-muted-foreground">Week Starting: {weekStartDate.toLocaleDateString()}</p>
              </div>

              {/* Add Submit for Approval button */}
              <Button onClick={proceedToReview} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Regular Hours</p>
                  <p className="text-2xl font-bold">{weeklyTotals.regular}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overtime Hours (1.5x)</p>
                  <p className="text-2xl font-bold text-amber-600">{weeklyTotals.overtime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Double Time Hours (2x)</p>
                  <p className="text-2xl font-bold text-red-600">{weeklyTotals.doubleTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{weeklyTotals.total}</p>
                </div>
              </div>
            </div>

            {/* Add Save Progress and Cancel buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{weeklyTotals.daysWorked}</span> days worked this week
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/employee/dashboard")}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <XCircleIcon className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={saveProgress} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <SaveIcon className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {weekDays.map((day) => (
                <Card key={day.name} className="overflow-hidden">
                  <CardHeader className="cursor-pointer bg-muted/20 py-3" onClick={() => toggleDayExpansion(day.name)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium">
                        {day.name} ({day.formattedDate})
                        {timesheetData[day.name.toLowerCase()]?.isSeventhConsecutiveDay && (
                          <span className="ml-2 text-sm text-amber-600 font-normal">(7th Consecutive Day)</span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        {calculatedHours[day.name.toLowerCase()]?.regular > 0 && (
                          <span className="text-sm font-medium">
                            {calculatedHours[day.name.toLowerCase()]?.regular} hrs
                          </span>
                        )}
                        {calculatedHours[day.name.toLowerCase()]?.overtime > 0 && (
                          <span className="text-sm font-medium text-amber-600">
                            +{calculatedHours[day.name.toLowerCase()]?.overtime} OT
                          </span>
                        )}
                        {calculatedHours[day.name.toLowerCase()]?.doubleTime > 0 && (
                          <span className="text-sm font-medium text-red-600">
                            +{calculatedHours[day.name.toLowerCase()]?.doubleTime} DT
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedDay === day.name && (
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${day.name.toLowerCase()}-did-not-work`}
                            checked={timesheetData[day.name.toLowerCase()]?.didNotWork || false}
                            onCheckedChange={(checked) =>
                              handleDayInputChange(day.name, "didNotWork", checked === true)
                            }
                          />
                          <Label
                            htmlFor={`${day.name.toLowerCase()}-did-not-work`}
                            className="font-medium text-muted-foreground"
                          >
                            I did not work on this day
                          </Label>
                        </div>

                        {validationErrors[day.name.toLowerCase()] &&
                          validationErrors[day.name.toLowerCase()].length > 0 && (
                            <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
                              <AlertDescription>
                                <ul className="list-disc pl-4 space-y-1">
                                  {validationErrors[day.name.toLowerCase()].map((error, index) => (
                                    <li key={index}>{error}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}

                        {!timesheetData[day.name.toLowerCase()]?.didNotWork && (
                          <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div className="space-y-2">
                                <Label htmlFor={`${day.name.toLowerCase()}-time-in`}>Time In</Label>
                                <Input
                                  id={`${day.name.toLowerCase()}-time-in`}
                                  type="time"
                                  value={timesheetData[day.name.toLowerCase()]?.timeIn || ""}
                                  onChange={(e) => handleDayInputChange(day.name, "timeIn", e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${day.name.toLowerCase()}-time-out`}>Time Out</Label>
                                <Input
                                  id={`${day.name.toLowerCase()}-time-out`}
                                  type="time"
                                  value={timesheetData[day.name.toLowerCase()]?.timeOut || ""}
                                  onChange={(e) => handleDayInputChange(day.name, "timeOut", e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Out of Town Time</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label htmlFor={`${day.name.toLowerCase()}-out-of-town-hours`} className="text-xs">
                                      Hours
                                    </Label>
                                    <Input
                                      id={`${day.name.toLowerCase()}-out-of-town-hours`}
                                      type="number"
                                      min="0"
                                      max="24"
                                      value={timesheetData[day.name.toLowerCase()]?.outOfTownHours || 0}
                                      onChange={(e) =>
                                        handleDayInputChange(
                                          day.name,
                                          "outOfTownHours",
                                          Number.parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`${day.name.toLowerCase()}-out-of-town-minutes`}
                                      className="text-xs"
                                    >
                                      Minutes
                                    </Label>
                                    <Input
                                      id={`${day.name.toLowerCase()}-out-of-town-minutes`}
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={timesheetData[day.name.toLowerCase()]?.outOfTownMinutes || 0}
                                      onChange={(e) =>
                                        handleDayInputChange(
                                          day.name,
                                          "outOfTownMinutes",
                                          Number.parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Meal Break</h4>
                              <BreakTimeEntry
                                dayName={day.name}
                                breakType="meal"
                                startTime={timesheetData[day.name.toLowerCase()]?.mealBreakStart || ""}
                                endTime={timesheetData[day.name.toLowerCase()]?.mealBreakEnd || ""}
                                duration={getBreakDuration(
                                  timesheetData[day.name.toLowerCase()]?.mealBreakStart || "",
                                  timesheetData[day.name.toLowerCase()]?.mealBreakEnd || "",
                                )}
                                onStartTimeChange={(value) => handleDayInputChange(day.name, "mealBreakStart", value)}
                                onEndTimeChange={(value) => handleDayInputChange(day.name, "mealBreakEnd", value)}
                              />
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">AM Break</h4>
                              <BreakTimeEntry
                                dayName={day.name}
                                breakType="am"
                                startTime={timesheetData[day.name.toLowerCase()]?.amBreakStart || ""}
                                endTime={timesheetData[day.name.toLowerCase()]?.amBreakEnd || ""}
                                duration={getBreakDuration(
                                  timesheetData[day.name.toLowerCase()]?.amBreakStart || "",
                                  timesheetData[day.name.toLowerCase()]?.amBreakEnd || "",
                                )}
                                onStartTimeChange={(value) => handleDayInputChange(day.name, "amBreakStart", value)}
                                onEndTimeChange={(value) => handleDayInputChange(day.name, "amBreakEnd", value)}
                              />
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">PM Break</h4>
                              <BreakTimeEntry
                                dayName={day.name}
                                breakType="pm"
                                startTime={timesheetData[day.name.toLowerCase()]?.pmBreakStart || ""}
                                endTime={timesheetData[day.name.toLowerCase()]?.pmBreakEnd || ""}
                                duration={getBreakDuration(
                                  timesheetData[day.name.toLowerCase()]?.pmBreakStart || "",
                                  timesheetData[day.name.toLowerCase()]?.pmBreakEnd || "",
                                )}
                                onStartTimeChange={(value) => handleDayInputChange(day.name, "pmBreakStart", value)}
                                onEndTimeChange={(value) => handleDayInputChange(day.name, "pmBreakEnd", value)}
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-2 border-t pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label
                              htmlFor={`${day.name.toLowerCase()}-reasons`}
                              className={isReasonRequired(day.name) ? "text-red-500 font-medium" : ""}
                            >
                              {timesheetData[day.name.toLowerCase()]?.didNotWork
                                ? isReasonRequiredForNotWorking(day.name)
                                  ? "Reason for not working (required)"
                                  : "Reason for not working (optional)"
                                : isWeekend(day.name) && !timesheetData[day.name.toLowerCase()]?.didNotWork
                                  ? "Reason for weekend work (required)"
                                  : (calculatedHours[day.name.toLowerCase()]?.overtime || 0) > 0 ||
                                      (calculatedHours[day.name.toLowerCase()]?.doubleTime || 0) > 0
                                    ? "Reason for overtime/double time (required)"
                                    : "Comments (optional)"}
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCommentVisibility(day.name)
                              }}
                            >
                              {visibleComments[day.name.toLowerCase()] ? "Hide Comments" : "Add Comments"}
                            </Button>
                          </div>

                          {/* Show textarea if comments are visible or if they're required */}
                          {(visibleComments[day.name.toLowerCase()] ||
                            isReasonRequired(day.name) ||
                            (timesheetData[day.name.toLowerCase()]?.reasons &&
                              timesheetData[day.name.toLowerCase()]?.reasons.trim() !== "")) && (
                            <Textarea
                              id={`${day.name.toLowerCase()}-reasons`}
                              value={timesheetData[day.name.toLowerCase()]?.reasons || ""}
                              onChange={(e) => handleDayInputChange(day.name, "reasons", e.target.value)}
                              placeholder="Enter any additional information here..."
                              required={isReasonRequired(day.name)}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Keep the banner for quick saving */}
      <WeeklyTotalsBanner
        regularHours={weeklyTotals.regular}
        overtimeHours={weeklyTotals.overtime}
        doubleTimeHours={weeklyTotals.doubleTime}
        totalHours={weeklyTotals.total}
        daysWorked={weeklyTotals.daysWorked}
        onSave={saveProgress}
        isSaving={isSaving}
      />
    </div>
  )
}

