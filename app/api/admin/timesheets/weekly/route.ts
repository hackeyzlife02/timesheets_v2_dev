import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser, isAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const weekStartDate = url.searchParams.get("weekStartDate")

    if (!weekStartDate) {
      return NextResponse.json({ success: false, message: "Week start date is required" }, { status: 400 })
    }

    console.log(`Fetching employee timesheet status for week starting: ${weekStartDate}`)

    // First, get all active employees
    const employees = await sql`
     SELECT 
       id,
       username,
       full_name as "fullName",
       email,
       is_admin as "isAdmin",
       employee_type as "employeeType",
       weekly_salary as "weeklySalary",
       is_active as "isActive"
     FROM users
     WHERE is_active = true
     AND is_admin = false
     ORDER BY full_name
   `

    console.log(`Found ${employees.length} active employees`)

    // Then, get all timesheets for the specified week
    const timesheets = await sql`
     SELECT 
       t.id,
       t.user_id as "userId",
       t.week_start_date as "weekStartDate",
       t.status,
       t.certified,
       t.submission_date as "submissionDate",
       t.admin_approved as "adminApproved",
       t.total_regular_hours as "totalRegularHours",
       t.total_overtime_hours as "totalOvertimeHours",
       t.total_double_time_hours as "totalDoubleTimeHours"
     FROM timesheets t
     WHERE DATE(t.week_start_date) = ${weekStartDate}::date
   `

    console.log(`Found ${timesheets.length} timesheets for the week`)

    // Create a map of user IDs to timesheets for quick lookup
    const timesheetsByUserId = new Map()
    for (const timesheet of timesheets) {
      timesheetsByUserId.set(timesheet.userId, timesheet)
    }

    // Combine employee data with timesheet data
    const result = employees.map((employee) => {
      const timesheet = timesheetsByUserId.get(employee.id)

      if (timesheet) {
        // Employee has a timesheet for this week
        let status = "Pending Review"
        if (timesheet.adminApproved) {
          status = "Approved"
        } else if (timesheet.certified && (timesheet.totalOvertimeHours > 0 || timesheet.totalDoubleTimeHours > 0)) {
          status = "Needs Review"
        } else if (timesheet.certified) {
          status = "Certified"
        } else if (timesheet.status === "draft") {
          status = "Started"
        }

        return {
          id: timesheet.id,
          userId: employee.id,
          employeeName: employee.fullName,
          employeeEmail: employee.email,
          employeeType: employee.employeeType,
          weeklySalary: employee.weeklySalary,
          status,
          hasTimesheet: true,
          totalRegularHours: timesheet.totalRegularHours || 0,
          totalOvertimeHours: timesheet.totalOvertimeHours || 0,
          totalDoubleTimeHours: timesheet.totalDoubleTimeHours || 0,
          certified: timesheet.certified,
          adminApproved: timesheet.adminApproved,
          submissionDate: timesheet.submissionDate,
        }
      } else {
        // Employee does not have a timesheet for this week
        return {
          id: `no-timesheet-${employee.id}`,
          userId: employee.id,
          employeeName: employee.fullName,
          employeeEmail: employee.email,
          employeeType: employee.employeeType,
          weeklySalary: employee.weeklySalary,
          status: "Not Started",
          hasTimesheet: false,
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalDoubleTimeHours: 0,
          certified: false,
          adminApproved: false,
          submissionDate: null,
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error fetching weekly timesheets:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch timesheets: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

