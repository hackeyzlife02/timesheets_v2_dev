"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react"

interface WeeklySubmissionStatsProps {
  stats: {
    totalEmployees: number
    hourlyEmployees: number
    timesheetsCreated: number
    timesheetsCertified: number
    pendingApproval: number
    totalHours: number
    totalSalary: number
    missingTimesheets?: number
  } | null
  weekStartDate: Date
}

export function WeeklySubmissionStats({ stats, weekStartDate }: WeeklySubmissionStatsProps) {
  const router = useRouter()

  if (!stats) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>No submission statistics are available for this week.</AlertDescription>
      </Alert>
    )
  }

  const isCurrentWeek = isWeekCurrent(weekStartDate)
  const isPastWeek = isPastDate(weekStartDate)

  // Calculate percentages using hourly employees as denominator for ALL metrics
  const createdPercentage =
    stats.hourlyEmployees > 0 ? Math.round((stats.timesheetsCreated / stats.hourlyEmployees) * 100) : 0

  const certifiedPercentage =
    stats.hourlyEmployees > 0 ? Math.round((stats.timesheetsCertified / stats.hourlyEmployees) * 100) : 0

  const approvedPercentage =
    stats.hourlyEmployees > 0
      ? Math.round(((stats.timesheetsCertified - stats.pendingApproval) / stats.hourlyEmployees) * 100)
      : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Timesheets Created</span>
                </div>
                <span className="text-sm font-medium">{createdPercentage}%</span>
              </div>
              <Progress value={createdPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {stats.timesheetsCreated} of {stats.hourlyEmployees} employees
                </span>
                <span>{stats.hourlyEmployees - stats.timesheetsCreated} missing</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Timesheets Certified</span>
                </div>
                <span className="text-sm font-medium">{certifiedPercentage}%</span>
              </div>
              <Progress value={certifiedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {stats.timesheetsCertified} of {stats.hourlyEmployees} employees
                </span>
                <span>{stats.hourlyEmployees - stats.timesheetsCertified} uncertified</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Timesheets Approved</span>
                </div>
                <span className="text-sm font-medium">{approvedPercentage}%</span>
              </div>
              <Progress value={approvedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {stats.timesheetsCertified - stats.pendingApproval} of {stats.hourlyEmployees} approved
                </span>
                <span>{stats.pendingApproval} pending</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Weekly Totals</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Hours</span>
                    <p className="text-lg font-semibold">{stats.totalHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Total Salary</span>
                    <p className="text-lg font-semibold">${stats.totalSalary.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCurrentWeek && stats.timesheetsCreated < stats.hourlyEmployees && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Missing Timesheets</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p>
              {stats.hourlyEmployees - stats.timesheetsCreated} employees have not created a timesheet for this week.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/admin/missing-timesheets")}
            >
              View Missing Timesheets
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isPastWeek && stats.timesheetsCertified < stats.hourlyEmployees && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Uncertified Timesheets</AlertTitle>
          <AlertDescription className="text-red-700">
            <p>{stats.hourlyEmployees - stats.timesheetsCertified} timesheets were not certified for this past week.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-white border-red-300 text-red-800 hover:bg-red-100"
              onClick={() => router.push("/admin/reports/uncertified")}
            >
              View Uncertified Timesheets
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {stats.pendingApproval > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Pending Approvals</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p>{stats.pendingApproval} certified timesheets are waiting for your approval.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-white border-blue-300 text-blue-800 hover:bg-blue-100"
              onClick={() => router.push("/admin/approvals")}
            >
              Review Pending Timesheets
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Helper function to check if a date is in the current week
function isWeekCurrent(date: Date): boolean {
  const today = new Date()
  const currentWeekStart = new Date(today)
  const day = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  const diff = day === 0 ? 6 : day - 1 // Adjust to get Monday
  currentWeekStart.setDate(today.getDate() - diff)
  currentWeekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(date)
  weekEnd.setDate(date.getDate() + 6)

  return date <= today && today <= weekEnd
}

// Helper function to check if a date is in the past
function isPastDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekEnd = new Date(date)
  weekEnd.setDate(date.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return weekEnd < today
}

