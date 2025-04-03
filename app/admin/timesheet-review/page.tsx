"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { WeekSelector } from "@/components/week-selector"
import { TimesheetReviewTable } from "@/components/timesheet-review-table"
import { ReviewProgressIndicator } from "@/components/review-progress-indicator"
import { Loader2, Search, Filter } from "lucide-react"
import { formatDate, getStartOfWeek, getEndOfWeek } from "@/lib/date-utils"
import { useToast } from "@/hooks/use-toast"

export default function TimesheetReviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [filteredTimesheets, setFilteredTimesheets] = useState<any[]>([])
  const [timesheetsLoading, setTimesheetsLoading] = useState(true)
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek())
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const [isCreatingTimesheet, setIsCreatingTimesheet] = useState(false)
  const [totalEmployees, setTotalEmployees] = useState(0)

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

    // Fetch timesheets for the selected week
    fetchTimesheets(weekStartDate)
  }, [router, weekStartDate])

  useEffect(() => {
    // Apply filters and search whenever timesheets, activeFilter, or searchQuery changes
    applyFiltersAndSearch()
  }, [timesheets, activeFilter, searchQuery])

  const fetchTimesheets = async (date: Date) => {
    try {
      setTimesheetsLoading(true)
      setError(null)

      const formattedDate = formatDate(date)
      const response = await fetch(`/api/admin/timesheets/weekly?weekStartDate=${formattedDate}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Weekly timesheets:", data)

      if (data.success) {
        setTimesheets(data.data || [])
        setFilteredTimesheets(data.data || [])
        setTotalEmployees(data.data.length || 0)
      } else {
        setError(data.message || "Failed to fetch timesheets")
        setTimesheets([])
        setFilteredTimesheets([])
      }
    } catch (error) {
      console.error("Error fetching timesheets:", error)
      setError(
        "An error occurred while fetching timesheets: " + (error instanceof Error ? error.message : String(error)),
      )
      setTimesheets([])
      setFilteredTimesheets([])
    } finally {
      setTimesheetsLoading(false)
    }
  }

  const createSalariedTimesheet = async (employeeId: number, employeeName: string, weekStartDate: string) => {
    try {
      setIsCreatingTimesheet(true)

      const response = await fetch("/api/admin/timesheets/create-salaried", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          weekStartDate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Timesheet Created",
          description: `Created salaried timesheet for ${employeeName}`,
        })

        // Refresh the timesheets list
        fetchTimesheets(new Date(weekStartDate))
      } else if (response.status === 409) {
        // Timesheet already exists
        toast({
          title: "Timesheet Already Exists",
          description: data.message,
        })

        // Refresh anyway to show the existing timesheet
        fetchTimesheets(new Date(weekStartDate))
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to create timesheet",
        })
      }
    } catch (error) {
      console.error("Error creating salaried timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while creating the timesheet",
      })
    } finally {
      setIsCreatingTimesheet(false)
    }
  }

  const createTimesheet = async (employeeId: number, employeeName: string, weekStartDate: string) => {
    try {
      setIsCreatingTimesheet(true)

      const response = await fetch("/api/admin/timesheets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          weekStartDate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Timesheet Created",
          description: `Created timesheet for ${employeeName}`,
        })

        // Refresh the timesheets list
        fetchTimesheets(new Date(weekStartDate))
      } else if (response.status === 409) {
        // Timesheet already exists
        toast({
          title: "Timesheet Already Exists",
          description: data.message,
        })

        // Refresh anyway to show the existing timesheet
        fetchTimesheets(new Date(weekStartDate))
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to create timesheet",
        })
      }
    } catch (error) {
      console.error("Error creating timesheet:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while creating the timesheet",
      })
    } finally {
      setIsCreatingTimesheet(false)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = [...timesheets]

    // Apply status/type filter
    if (activeFilter !== "all") {
      switch (activeFilter) {
        case "hourly":
          filtered = filtered.filter((t) => t.employeeType === "hourly")
          break
        case "salary":
          filtered = filtered.filter((t) => t.employeeType === "salary")
          break
        case "pending":
          filtered = filtered.filter((t) => t.status === "Pending Review")
          break
        case "approved":
          filtered = filtered.filter((t) => t.status === "Approved")
          break
        case "needs-review":
          filtered = filtered.filter((t) => t.status === "Needs Review")
          break
        case "not-started":
          filtered = filtered.filter((t) => t.status === "Not Started")
          break
        case "in-progress":
          filtered = filtered.filter((t) => t.status === "Started")
          break
      }
    }

    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((t) => t.employeeName.toLowerCase().includes(query))
    }

    setFilteredTimesheets(filtered)
  }

  const handleWeekChange = (date: Date) => {
    setWeekStartDate(date)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (value: string) => {
    setActiveFilter(value)
  }

  const handleReviewTimesheet = (timesheetId: number) => {
    router.push(`/admin/timesheet/${timesheetId}/review`)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // Calculate progress stats
  const totalTimesheetsCount = timesheets.filter((t) => t.hasTimesheet).length
  const reviewedTimesheets = timesheets.filter((t) => t.status === "Approved").length
  const needsReviewTimesheets = timesheets.filter((t) => t.status === "Needs Review").length
  const pendingTimesheets = timesheets.filter((t) => t.status === "Pending Review" || t.status === "Certified").length
  const notStartedTimesheets = timesheets.filter((t) => t.status === "Not Started").length
  const inProgressTimesheets = timesheets.filter((t) => t.status === "Started").length

  // Format date for API
  const formattedWeekStartDate = formatDate(weekStartDate)

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">Weekly Timesheet Review</h1>
              <WeekSelector currentWeek={weekStartDate} onWeekChange={handleWeekChange} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-lg">
                Week of{" "}
                <span className="font-medium">
                  {weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                  {getEndOfWeek(weekStartDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search employees..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden md:flex"
                  onClick={() => fetchTimesheets(weekStartDate)}
                >
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
              </div>
            </div>

            <ReviewProgressIndicator
              totalEmployees={totalEmployees}
              reviewed={reviewedTimesheets}
              needsReview={needsReviewTimesheets}
              pending={pendingTimesheets}
            />

            <Tabs defaultValue="all" value={activeFilter} onValueChange={handleFilterChange}>
              <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="salary">Salaried</TabsTrigger>
                <TabsTrigger value="not-started">Not Started</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="needs-review">Needs Review</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>

              <TabsContent value={activeFilter} className="mt-0">
                {error && (
                  <Card className="mb-4 border-red-200 bg-red-50">
                    <CardContent className="p-4 text-red-800">
                      <p>{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-white"
                        onClick={() => fetchTimesheets(weekStartDate)}
                      >
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {timesheetsLoading || isCreatingTimesheet ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <p>{isCreatingTimesheet ? "Creating timesheet..." : "Loading timesheets..."}</p>
                  </div>
                ) : (
                  <TimesheetReviewTable
                    timesheets={filteredTimesheets}
                    onReview={handleReviewTimesheet}
                    onCreateSalariedTimesheet={createSalariedTimesheet}
                    onCreateTimesheet={createTimesheet}
                    weekStartDate={formattedWeekStartDate}
                  />
                )}
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Not Started</div>
                  <div className="text-2xl font-bold">{notStartedTimesheets}</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="text-sm text-purple-500">In Progress</div>
                  <div className="text-2xl font-bold">{inProgressTimesheets}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-sm text-blue-500">Pending Review</div>
                  <div className="text-2xl font-bold">{pendingTimesheets}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-sm text-green-500">Approved</div>
                  <div className="text-2xl font-bold">{reviewedTimesheets}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

