import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    // Create a fresh SQL client for this request
    const sql = neon(process.env.DATABASE_URL!)

    // Get the week start date from the query parameters
    const searchParams = request.nextUrl.searchParams
    const weekStartDateParam = searchParams.get("weekStartDate")

    if (!weekStartDateParam) {
      return NextResponse.json({ success: false, message: "weekStartDate parameter is required" }, { status: 400 })
    }

    // Parse the date as is
    const weekStartDate = new Date(weekStartDateParam)

    // Format date for SQL query
    const formattedStartDate = weekStartDate.toISOString().split("T")[0]

    console.log(`Fetching pending approvals for week starting: ${formattedStartDate}`)

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

      if (checkColumns && checkColumns.length > 0) {
        for (const row of checkColumns) {
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
    let timesheets = []

    if (employeeTypeExists && weeklySalaryExists) {
      const result = await sql`
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
        WHERE DATE(t.week_start_date) = ${formattedStartDate}::date
        AND t.certified = true
        AND t.admin_approved = false
        ORDER BY t.submission_date ASC
      `
      timesheets = result
    } else {
      const result = await sql`
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
        WHERE DATE(t.week_start_date) = ${formattedStartDate}::date
        AND t.certified = true
        AND t.admin_approved = false
        ORDER BY t.submission_date ASC
      `
      timesheets = result
    }

    // Add default values for missing columns
    const formattedTimesheets = timesheets.map((timesheet) => ({
      ...timesheet,
      employeeType: timesheet.employeeType || "hourly",
      weeklySalary: timesheet.weeklySalary || 0,
    }))

    // Return the pending timesheets
    return NextResponse.json({
      success: true,
      data: formattedTimesheets,
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

