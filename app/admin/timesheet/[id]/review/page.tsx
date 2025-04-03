"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Loader2, ArrowLeft, Save, CheckCircle } from "lucide-react"
import { DailyReviewPane } from "@/components/daily-review-pane"
import { WeeklySummaryPane } from "@/components/weekly-summary-pane"
import { useToast } from "@/hooks/use-toast"

export default function TimesheetReviewDetailPage() {
  const router = useRouter()
  const params = useParams()
  const timesheetId = params.id as string
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheet, setTimesheet] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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

      console.log(`Fetching timesheet with ID: ${timesheetId}`)
      const response = await fetch(`/api/admin/timesheets/${timesheetId}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error response (${response.status}):`, errorText)

        if (response.status === 404) {
          throw new Error(`Timesheet with ID ${timesheetId} not found`)
        } else {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
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
          expenses: data.data.expenses || [],
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

  const handleDayUpdate = (dayName: string, updatedDay: any) => {
    setTimesheet((prev: any) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayName]: updatedDay,
      },
    }))
    setHasChanges(true)
  }

  const handleSummaryUpdate = (updatedSummary: any) => {
    setTimesheet((prev: any) => ({
      ...prev,
      ...updatedSummary,
    }))
    setHasChanges(true)
  }

  const handleExpensesUpdate = (updatedExpenses: any[]) => {
    setTimesheet((prev: any) => ({
      ...prev,
      expenses: updatedExpenses,
    }))
    setHasChanges(true)
  }

  const saveChanges = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/admin/timesheets/${timesheetId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timesheet,
          updatedBy: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Changes saved",
          description: "Timesheet has been updated successfully.",
        })
        setHasChanges(false)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to save changes",
        })
      }
    } catch (error) {
      console.error("Error saving timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "An error occurred while saving changes: " + (error instanceof Error ? error.message : String(error)),
      })
    } finally {
      setSaving(false)
    }
  }

  const approveTimesheet = async () => {
    try {
      setApproving(true)

      // Save any pending changes first
      if (hasChanges) {
        await saveChanges()
      }

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

        toast({
          title: "Timesheet approved",
          description: "The timesheet has been approved successfully.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to approve timesheet",
        })
      }
    } catch (error) {
      console.error("Error approving timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "An error occurred while approving the timesheet: " +
          (error instanceof Error ? error.message : String(error)),
      })
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
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/timesheet-review")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Review
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

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/timesheet-review")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Review
                </Button>
                <h1 className="text-3xl font-bold">Timesheet Review</h1>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={saveChanges}
                  disabled={saving || !hasChanges || timesheet.adminApproved}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button onClick={approveTimesheet} disabled={approving || timesheet.adminApproved}>
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
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">{timesheet.employeeName}</h2>
                    <p className="text-sm text-muted-foreground">{timesheet.employeeEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Week of {formattedDate}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(timesheet.submissionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Tabs defaultValue="daily" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
                    <TabsTrigger value="summary">Weekly Summary</TabsTrigger>
                  </TabsList>
                  <TabsContent value="daily" className="mt-6">
                    <DailyReviewPane
                      days={timesheet.days}
                      onDayUpdate={handleDayUpdate}
                      isReadOnly={timesheet.adminApproved}
                    />
                  </TabsContent>
                  <TabsContent value="summary" className="mt-6">
                    <WeeklySummaryPane
                      timesheet={timesheet}
                      onSummaryUpdate={handleSummaryUpdate}
                      onExpensesUpdate={handleExpensesUpdate}
                      isReadOnly={timesheet.adminApproved}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

