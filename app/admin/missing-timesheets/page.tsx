"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { AlertCircle, Calendar, Loader2, Mail, RefreshCw } from "lucide-react"

export default function MissingTimesheetsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek())
  const [missingEmployees, setMissingEmployees] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState("")
  const [sendingReminders, setSendingReminders] = useState(false)

  // Helper function to get the start of the current week (Monday)
  function getStartOfWeek() {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

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
    setLoading(false)

    // Fetch missing timesheets for the current week
    fetchMissingTimesheets(weekStartDate)
  }, [router, weekStartDate])

  const fetchMissingTimesheets = async (date: Date) => {
    try {
      setDataLoading(true)
      const formattedDate = formatDate(date)
      const response = await fetch(`/api/admin/missing-timesheets?weekStartDate=${formattedDate}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setMissingEmployees(data.data.employees || [])
        // Reset selection when data changes
        setSelectedEmployees(new Set())
        setSelectAll(false)

        // Set default reminder message
        setReminderMessage(
          `Hello {name},\n\nThis is a friendly reminder to submit your timesheet for the week of ${formatDateForDisplay(date)}.\n\nThank you,\n${user?.fullName || "Admin"}`,
        )
      } else {
        console.error("Failed to fetch missing timesheets:", data.message)
        toast({
          title: "Error",
          description: "Failed to fetch missing timesheets. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching missing timesheets:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDataLoading(false)
    }
  }

  const sendReminders = async () => {
    try {
      setSendingReminders(true)

      if (selectedEmployees.size === 0) {
        toast({
          title: "No employees selected",
          description: "Please select at least one employee to send a reminder.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/admin/send-reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: Array.from(selectedEmployees),
          message: reminderMessage,
          weekStartDate: formatDate(weekStartDate),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Reminders Sent",
          description: `Successfully sent reminders to ${data.data.emailsSent.length} employees.`,
        })
        setReminderDialogOpen(false)
      } else {
        console.error("Failed to send reminders:", data.message)
        toast({
          title: "Error",
          description: "Failed to send reminders. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending reminders:", error)
      toast({
        title: "Error",
        description: "An error occurred while sending reminders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingReminders(false)
    }
  }

  // Helper function to format date as YYYY-MM-DD
  function formatDate(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Helper function to format date for display
  function formatDateForDisplay(date: Date) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  // Function to navigate to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStartDate)
    prevWeek.setDate(prevWeek.getDate() - 7)
    setWeekStartDate(prevWeek)
  }

  // Function to navigate to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(weekStartDate)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setWeekStartDate(nextWeek)
  }

  // Function to go to current week
  const goToCurrentWeek = () => {
    setWeekStartDate(getStartOfWeek())
  }

  // Check if the selected week is the current week
  const isCurrentWeek = () => {
    const currentWeekStart = getStartOfWeek()
    return (
      weekStartDate.getFullYear() === currentWeekStart.getFullYear() &&
      weekStartDate.getMonth() === currentWeekStart.getMonth() &&
      weekStartDate.getDate() === currentWeekStart.getDate()
    )
  }

  // Handle employee selection
  const toggleEmployeeSelection = (employeeId: number) => {
    const newSelection = new Set(selectedEmployees)
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId)
      setSelectAll(false)
    } else {
      newSelection.add(employeeId)
      // Check if all employees are now selected
      if (newSelection.size === missingEmployees.length) {
        setSelectAll(true)
      }
    }
    setSelectedEmployees(newSelection)
  }

  // Handle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedEmployees(new Set())
    } else {
      // Select all
      const allIds = missingEmployees.map((emp) => emp.id)
      setSelectedEmployees(new Set(allIds))
    }
    setSelectAll(!selectAll)
  }

  // Open reminder dialog
  const openReminderDialog = () => {
    if (selectedEmployees.size === 0) {
      toast({
        title: "No employees selected",
        description: "Please select at least one employee to send a reminder.",
        variant: "destructive",
      })
      return
    }
    setReminderDialogOpen(true)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Missing Timesheets</h1>
              <Button onClick={() => fetchMissingTimesheets(weekStartDate)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  Week of{" "}
                  {weekStartDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  Previous Week
                </Button>
                <Button
                  variant={isCurrentWeek() ? "default" : "outline"}
                  size="sm"
                  onClick={goToCurrentWeek}
                  className={
                    isCurrentWeek() ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-50 hover:bg-blue-100 border-blue-200"
                  }
                >
                  Current Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  Next Week
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Employees Missing Timesheets</CardTitle>
                    <CardDescription>Hourly employees who have not submitted a timesheet for this week</CardDescription>
                  </div>
                  {missingEmployees.length > 0 && (
                    <Button onClick={openReminderDialog} disabled={selectedEmployees.size === 0}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reminders
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <p>Loading missing timesheets...</p>
                  </div>
                ) : missingEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-green-100 p-3 mb-4">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium">All Timesheets Submitted</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All hourly employees have submitted their timesheets for this week.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center py-2 px-4 bg-muted rounded-md mb-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="select-all"
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all employees"
                        />
                        <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                          Select All
                        </label>
                      </div>
                      <div className="ml-auto text-sm text-muted-foreground">
                        {selectedEmployees.size} of {missingEmployees.length} selected
                      </div>
                    </div>

                    <div className="border rounded-md divide-y">
                      {missingEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center py-3 px-4 hover:bg-muted/50">
                          <Checkbox
                            id={`employee-${employee.id}`}
                            checked={selectedEmployees.has(employee.id)}
                            onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                            aria-label={`Select ${employee.full_name}`}
                          />
                          <div className="ml-4 flex-1">
                            <div className="font-medium">{employee.full_name}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployees(new Set([employee.id]))
                              openReminderDialog()
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {missingEmployees.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  {missingEmployees.length} employee(s) missing timesheets for this week
                </div>
                <Button onClick={openReminderDialog} disabled={selectedEmployees.size === 0}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminders
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder to {selectedEmployees.size} employee(s) to submit their timesheet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Enter your reminder message..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{name}"} to include the employee's name in the message.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)} disabled={sendingReminders}>
              Cancel
            </Button>
            <Button onClick={sendReminders} disabled={sendingReminders}>
              {sendingReminders ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

