import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get the week start date from the query parameters
    const searchParams = request.nextUrl.searchParams
    const weekStartDateParam = searchParams.get("weekStartDate")

    if (!weekStartDateParam) {
      return NextResponse.json({ success: false, message: "weekStartDate parameter is required" }, { status: 400 })
    }

    // Parse the date
    const weekStartDate = new Date(weekStartDateParam)

    // Calculate the end of the week (Sunday)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)
    weekEndDate.setHours(23, 59, 59, 999)

    console.log(`Fetching pending approvals for week: ${weekStartDate.toISOString()} to ${weekEndDate.toISOString()}`)

    // Check if employee_type and weekly_salary columns exist
    let employeeTypeExists = false
    let weeklySalaryExists = false

    try {
      const checkColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('employee_type', 'weekly_salary')
      `

      if (checkColumns && checkColumns.rows) {
        for (const row of checkColumns.rows) {
          if (row.column_name === "employee_type") employeeTypeExists = true
          if (row.column_name === "weekly_salary") weeklySalaryExists = true
        }
      }

      console.log(`employee_type column exists: ${employeeTypeExists}`)
      console.log(`weekly_salary column exists: ${weeklySalaryExists}`)
    } catch (error) {
      console.error("Error checking for user columns:", error)
    }

    // Build the query based on which columns exist
    let query

    if (employeeTypeExists && weeklySalaryExists) {
      query = sql`
        SELECT 
          t.id,
          t.user_id as "userId",
          t.week_start_date as "weekStartDate",
          t.status,
          t.certified,
          t.submission_date as "submissionDate",
          t.total_regular_hours as "totalRegularHours",
          t.total_overtime_hours as "totalOvertimeHours",
          t.total_double_time_hours as "totalDoubleTimeHours",
          u.full_name as "employeeName",
          u.email as "employeeEmail",
          u.employee_type as "employeeType",
          u.weekly_salary as "weeklySalary"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.week_start_date >= ${weekStartDate} 
        AND t.week_start_date < ${weekEndDate}
        AND t.certified = true
        ORDER BY t.submission_date ASC
      `
    } else {
      query = sql`
        SELECT 
          t.id,
          t.user_id as "userId",
          t.week_start_date as "weekStartDate",
          t.status,
          t.certified,
          t.submission_date as "submissionDate",
          t.total_regular_hours as "totalRegularHours",
          t.total_overtime_hours as "totalOvertimeHours",
          t.total_double_time_hours as "totalDoubleTimeHours",
          u.full_name as "employeeName",
          u.email as "employeeEmail"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.week_start_date >= ${weekStartDate} 
        AND t.week_start_date < ${weekEndDate}
        AND t.certified = true
        ORDER BY t.submission_date ASC
      `
    }

    const result = await query

    // Add default values for missing columns
    const timesheets = result.rows.map((timesheet) => ({
      ...timesheet,
      employeeType: timesheet.employeeType || "hourly",
      weeklySalary: timesheet.weeklySalary || 0,
    }))

    // Return the pending timesheets
    return NextResponse.json({
      success: true,
      data: timesheets,
    })
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch pending approvals: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

