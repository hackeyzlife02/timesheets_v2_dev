"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Clock, MoreHorizontal, FileEdit, FilePlus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TimesheetReviewTableProps {
  timesheets: any[]
  onReview: (timesheetId: number) => void
  onCreateSalariedTimesheet?: (employeeId: number, employeeName: string, weekStartDate: string) => void
  onCreateTimesheet?: (employeeId: number, employeeName: string, weekStartDate: string) => void
  weekStartDate?: string
}

export function TimesheetReviewTable({
  timesheets,
  onReview,
  onCreateSalariedTimesheet,
  onCreateTimesheet,
  weekStartDate,
}: TimesheetReviewTableProps) {
  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "Needs Review":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        )
      case "Certified":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Certified
          </Badge>
        )
      case "Started":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <FileEdit className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case "Not Started":
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            Not Started
          </Badge>
        )
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Employee Type</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead className="text-right">Weekly Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timesheets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No employees found for this week
              </TableCell>
            </TableRow>
          ) : (
            timesheets.map((timesheet) => (
              <TableRow key={timesheet.id}>
                <TableCell className="font-medium">{timesheet.employeeName}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`capitalize ${timesheet.employeeType === "salary" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}`}
                  >
                    {timesheet.employeeType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!timesheet.hasTimesheet
                    ? "—"
                    : (
                        (Number(timesheet.totalRegularHours) || 0) +
                        (Number(timesheet.totalOvertimeHours) || 0) +
                        (Number(timesheet.totalDoubleTimeHours) || 0)
                      ).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {timesheet.employeeType === "salary" ? `$${Number(timesheet.weeklySalary).toFixed(2)}` : "—"}
                </TableCell>
                <TableCell>{renderStatusBadge(timesheet.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!timesheet.hasTimesheet ? (
                        timesheet.employeeType === "salary" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              onCreateSalariedTimesheet &&
                              onCreateSalariedTimesheet(timesheet.userId, timesheet.employeeName, weekStartDate || "")
                            }
                          >
                            <FilePlus className="h-4 w-4 mr-2" />
                            Create Salaried Timesheet
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              onCreateTimesheet &&
                              onCreateTimesheet(timesheet.userId, timesheet.employeeName, weekStartDate || "")
                            }
                          >
                            <FilePlus className="h-4 w-4 mr-2" />
                            Create Timesheet
                          </DropdownMenuItem>
                        )
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => onReview(timesheet.id)}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Review Timesheet
                          </DropdownMenuItem>
                          {timesheet.status === "Started" && (
                            <DropdownMenuItem>
                              <Clock className="h-4 w-4 mr-2" />
                              Remind Employee
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

