"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { calculateDayHours, calculateBreakDuration, validateBreakTimes, type DayEntry } from "@/lib/timesheet"
import { useToast } from "@/hooks/use-toast"

// Import the WeeklyTotalsBanner component at the top of the file
import { WeeklyTotalsBanner } from "@/components/weekly-totals-banner"

// Helper function to get the start of the current week (Monday)
function getStartOfWeek() {
  const now = new Date()
  console.log("Current date:", now.toISOString())

  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  console.log("Current day of week:", day)

  // Calculate days to subtract to get to Monday
  // If today is Sunday (0), we need to go back 6 days to previous Monday
  // If today is Monday (1), we need to go back 0 days
  // If today is Tuesday (2), we need to go back 1 day, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1
  console.log("Days to subtract to get to Monday:", daysToSubtract)

  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  console.log("Calculated Monday date:", monday.toISOString())

  return monday
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to get day name
function getDayName(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" })
}

// Generate array of days for the week
function getWeekDays(startDate: Date) {
  console.log("Generating week days starting from:", startDate.toISOString())

  // Ensure startDate is a Monday
  const dayOfWeek = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  if (dayOfWeek !== 1) {
    console.warn("Start date is not a Monday! Day of week:", dayOfWeek)
    // Adjust to the nearest Monday if needed
    const daysToAdjust = dayOfWeek === 0 ? 1 : dayOfWeek - 1
    startDate = new Date(startDate)
    startDate.setDate(startDate.getDate() - daysToAdjust)
    console.log("Adjusted to Monday:", startDate.toISOString())
  }

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

  // Verify the days of the week are correct
  console.log(
    "Generated days:",
    days.map((d) => `${d.name} (${d.formattedDate})`),
  )

  return days
}

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

export default function NewTimesheet() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek())
  const [weekDays, setWeekDays] = useState<any[]>([])
  const [timesheetData, setTimesheetData] = useState<{ [key: string]: DayEntry }>({})
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [isCertified, setIsCertified] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({})
  const [weeklyTotals, setWeeklyTotals] = useState({
    regular: 0,
    overtime: 0,
    doubleTime: 0,
    total: 0,
    daysWorked: 0, // Add days worked
  })
  const [calculatedHours, setCalculatedHours] = useState<{
    [key: string]: {
      regular: number
      overtime: number
      doubleTime: number
    }
  }>({})
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)

    // Initialize week days
    const days = getWeekDays(weekStartDate)
    setWeekDays(days)

    // Initialize timesheet data structure with default values
    const initialData: { [key: string]: DayEntry } = {}
    days.forEach((day) => {
      const dayName = day.name.toLowerCase()
      const isWeekendDay = isWeekend(dayName)

      initialData[dayName] = {
        didNotWork: isWeekendDay, // Set to true for Saturday and Sunday
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

    // Expand the first weekday by default
    if (days.length > 0) {
      setExpandedDay(days[0].name)
    }
  }, [router, weekStartDate])

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

    // Update weekly totals without updating timesheetData
    setWeeklyTotals({
      regular: Number.parseFloat(totalRegular.toFixed(2)),
      overtime: Number.parseFloat(totalOvertime.toFixed(2)),
      doubleTime: Number.parseFloat(totalDoubleTime.toFixed(2)),
      total: Number.parseFloat((totalRegular + totalOvertime + totalDoubleTime).toFixed(2)),
      daysWorked: daysWorkedCount, // Add days worked to weekly totals
    })

    // Store calculated hours for display without updating state
    setCalculatedHours(dayHours)

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

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    setWeekStartDate(newDate)
  }

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
    return Math.round(duration * 60) // Convert hours to minutes
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the validation errors before submitting.",
      })
      return
    }

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
        userId: user?.id,
        weekStartDate: formatDate(weekStartDate),
        status: isCertified ? "certified" : "draft",
        certified: isCertified,
        days: submissionData,
        totalRegularHours: weeklyTotals.regular,
        totalOvertimeHours: weeklyTotals.overtime,
        totalDoubleTimeHours: weeklyTotals.doubleTime,
      }

      console.log("Submitting timesheet with start date:", formatDate(weekStartDate))

      // Send the data to the API
      const response = await fetch("/api/timesheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timesheetSubmission),
      })

      const result = await response.json()

      if (!result.success) {
        // Check if it's a duplicate timesheet error
        if (result.duplicate) {
          toast({
            variant: "destructive",
            title: "Duplicate Timesheet",
            description: "A timesheet already exists for this week. You can only have one timesheet per week.",
          })

          // Redirect to timesheets list so they can find the existing one
          setTimeout(() => {
            router.push("/employee/timesheets")
          }, 2000)

          return
        }

        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to save timesheet",
        })
        return
      }

      // Show success message
      if (isCertified) {
        toast({
          title: "Success",
          description: "Timesheet certified successfully!",
          variant: "success",
        })
        // Redirect to timesheets list for certified timesheets
        router.push("/employee/timesheets")
      } else {
        toast({
          title: "Success",
          description: "Timesheet saved as draft.",
        })
        // Redirect to dashboard for saved drafts
        router.push("/employee/dashboard")
      }
    } catch (error) {
      console.error("Error submitting timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while submitting the timesheet. Please try again.",
      })
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

        <main className="flex-1 p-6 pb-16">
          {" "}
          {/* Add pb-16 to ensure content doesn't get hidden behind the banner */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl font-bold">New Timesheet</h1>
              <div className="flex items-center gap-2">
                <Label htmlFor="week-start-date">Week Starting:</Label>
                <Input
                  id="week-start-date"
                  type="date"
                  value={formatDate(weekStartDate)}
                  onChange={handleDateChange}
                  className="w-auto"
                />
              </div>
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

            <form onSubmit={handleSubmit} className="space-y-6">
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
                                  value={timesheetData[day.name.toLowerCase()]?.timeIn || DEFAULT_TIME_IN}
                                  onChange={(e) => handleDayInputChange(day.name, "timeIn", e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${day.name.toLowerCase()}-time-out`}>Time Out</Label>
                                <Input
                                  id={`${day.name.toLowerCase()}-time-out`}
                                  type="time"
                                  value={timesheetData[day.name.toLowerCase()]?.timeOut || DEFAULT_TIME_OUT}
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
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-meal-break-start`}>Start Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-meal-break-start`}
                                    type="time"
                                    value={
                                      timesheetData[day.name.toLowerCase()]?.mealBreakStart || DEFAULT_MEAL_BREAK_START
                                    }
                                    onChange={(e) => handleDayInputChange(day.name, "mealBreakStart", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-meal-break-end`}>End Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-meal-break-end`}
                                    type="time"
                                    value={
                                      timesheetData[day.name.toLowerCase()]?.mealBreakEnd || DEFAULT_MEAL_BREAK_END
                                    }
                                    onChange={(e) => handleDayInputChange(day.name, "mealBreakEnd", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Duration</Label>
                                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                                    {getBreakDuration(
                                      timesheetData[day.name.toLowerCase()]?.mealBreakStart || DEFAULT_MEAL_BREAK_START,
                                      timesheetData[day.name.toLowerCase()]?.mealBreakEnd || DEFAULT_MEAL_BREAK_END,
                                    )}{" "}
                                    minutes
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">AM Break</h4>
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-am-break-start`}>Start Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-am-break-start`}
                                    type="time"
                                    value={
                                      timesheetData[day.name.toLowerCase()]?.amBreakStart || DEFAULT_AM_BREAK_START
                                    }
                                    onChange={(e) => handleDayInputChange(day.name, "amBreakStart", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-am-break-end`}>End Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-am-break-end`}
                                    type="time"
                                    value={timesheetData[day.name.toLowerCase()]?.amBreakEnd || DEFAULT_AM_BREAK_END}
                                    onChange={(e) => handleDayInputChange(day.name, "amBreakEnd", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Duration</Label>
                                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                                    {getBreakDuration(
                                      timesheetData[day.name.toLowerCase()]?.amBreakStart || DEFAULT_AM_BREAK_START,
                                      timesheetData[day.name.toLowerCase()]?.amBreakEnd || DEFAULT_AM_BREAK_END,
                                    )}{" "}
                                    minutes
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">PM Break</h4>
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-pm-break-start`}>Start Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-pm-break-start`}
                                    type="time"
                                    value={
                                      timesheetData[day.name.toLowerCase()]?.pmBreakStart || DEFAULT_PM_BREAK_START
                                    }
                                    onChange={(e) => handleDayInputChange(day.name, "pmBreakStart", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`${day.name.toLowerCase()}-pm-break-end`}>End Time</Label>
                                  <Input
                                    id={`${day.name.toLowerCase()}-pm-break-end`}
                                    type="time"
                                    value={timesheetData[day.name.toLowerCase()]?.pmBreakEnd || DEFAULT_PM_BREAK_END}
                                    onChange={(e) => handleDayInputChange(day.name, "pmBreakEnd", e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Duration</Label>
                                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                                    {getBreakDuration(
                                      timesheetData[day.name.toLowerCase()]?.pmBreakStart || DEFAULT_PM_BREAK_START,
                                      timesheetData[day.name.toLowerCase()]?.pmBreakEnd || DEFAULT_PM_BREAK_END,
                                    )}{" "}
                                    minutes
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="space-y-2 border-t pt-4">
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
                                  : "Notes (optional)"}
                          </Label>
                          <Textarea
                            id={`${day.name.toLowerCase()}-reasons`}
                            value={timesheetData[day.name.toLowerCase()]?.reasons || ""}
                            onChange={(e) => handleDayInputChange(day.name, "reasons", e.target.value)}
                            placeholder="Enter any additional information here..."
                            required={isReasonRequired(day.name)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="certify-checkbox"
                        checked={isCertified}
                        onCheckedChange={(checked) => setIsCertified(checked === true)}
                      />
                      <Label htmlFor="certify-checkbox" className="text-sm text-muted-foreground">
                        I certify that the hours reported in this timesheet are true and complete to the best of my
                        knowledge, and I have not falsified or omitted any work hours. I understand that any
                        misrepresentation may result in disciplinary action and legal consequences in accordance with
                        applicable San Francisco and California labor laws.
                      </Label>
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={() => router.push("/employee/dashboard")}>
                        Cancel
                      </Button>
                      <Button type="submit">{isCertified ? "Certify Timesheet" : "Save Progress"}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </main>
      </div>

      {/* Move the banner outside the flex container but inside the main wrapper */}
      <WeeklyTotalsBanner
        regularHours={weeklyTotals.regular}
        overtimeHours={weeklyTotals.overtime}
        doubleTimeHours={weeklyTotals.doubleTime}
        totalHours={weeklyTotals.total}
        daysWorked={weeklyTotals.daysWorked} // Pass days worked
      />
    </div>
  )
}

