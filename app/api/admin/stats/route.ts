import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN STATS API CALLED ===")

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

    console.log(`Fetching stats for week starting: ${formattedStartDate}`)

    // Get total number of hourly employees (for denominator)
    let hourlyEmployees = 0
    try {
      const hourlyEmployeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true
        AND employee_type = 'hourly'
      `

      if (hourlyEmployeesResult && hourlyEmployeesResult.length > 0) {
        hourlyEmployees = Number.parseInt(hourlyEmployeesResult[0].count, 10) || 0
      }
      console.log(`Total hourly employees: ${hourlyEmployees}`)
    } catch (e) {
      console.error("Error counting hourly employees:", e)
    }

    // Get total number of active employees
    let totalEmployees = 0
    try {
      const employeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true
      `

      if (employeesResult && employeesResult.length > 0) {
        totalEmployees = Number.parseInt(employeesResult[0].count, 10) || 0
      }
      console.log(`Total active employees: ${totalEmployees}`)
    } catch (e) {
      console.error("Error counting employees:", e)
    }

    // Get number of timesheets created for this week
    let timesheetsCreated = 0
    try {
      const timesheetsCreatedResult = await sql`
        SELECT COUNT(*) as count 
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
      `

      if (timesheetsCreatedResult && timesheetsCreatedResult.length > 0) {
        timesheetsCreated = Number.parseInt(timesheetsCreatedResult[0].count, 10) || 0
      }
      console.log(`Timesheets created: ${timesheetsCreated}`)
    } catch (e) {
      console.error("Error counting timesheets created:", e)
    }

    // Get number of certified timesheets for this week
    let timesheetsCertified = 0
    try {
      const timesheetsCertifiedResult = await sql`
        SELECT COUNT(*) as count 
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
        AND certified = true
      `

      if (timesheetsCertifiedResult && timesheetsCertifiedResult.length > 0) {
        timesheetsCertified = Number.parseInt(timesheetsCertifiedResult[0].count, 10) || 0
      }
      console.log(`Timesheets certified: ${timesheetsCertified}`)
    } catch (e) {
      console.error("Error counting certified timesheets:", e)
    }

    // Get number of pending approval timesheets
    let pendingApproval = 0
    try {
      const pendingApprovalResult = await sql`
        SELECT COUNT(*) as count 
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
        AND certified = true
        AND admin_approved = false
      `

      if (pendingApprovalResult && pendingApprovalResult.length > 0) {
        pendingApproval = Number.parseInt(pendingApprovalResult[0].count, 10) || 0
      }
      console.log(`Pending approval: ${pendingApproval}`)
    } catch (e) {
      console.error("Error counting pending approvals:", e)
    }

    // Get hours for different statuses
    // 1. Pending Hours (uncertified)
    let pendingRegularHours = 0
    let pendingOvertimeHours = 0
    let pendingDoubleTimeHours = 0
    try {
      const pendingHoursResult = await sql`
        SELECT 
          COALESCE(SUM(total_regular_hours), 0) as regular,
          COALESCE(SUM(total_overtime_hours), 0) as overtime,
          COALESCE(SUM(total_double_time_hours), 0) as doubletime
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
        AND certified = false
      `

      if (pendingHoursResult && pendingHoursResult.length > 0) {
        pendingRegularHours = Number.parseFloat(pendingHoursResult[0].regular || 0)
        pendingOvertimeHours = Number.parseFloat(pendingHoursResult[0].overtime || 0)
        pendingDoubleTimeHours = Number.parseFloat(pendingHoursResult[0].doubletime || 0)
      }
    } catch (e) {
      console.error("Error calculating pending hours:", e)
    }

    const pendingHours = pendingRegularHours + pendingOvertimeHours + pendingDoubleTimeHours
    console.log(`Pending hours: ${pendingHours}`)

    // 2. Submitted Hours (certified but not approved)
    let submittedRegularHours = 0
    let submittedOvertimeHours = 0
    let submittedDoubleTimeHours = 0
    try {
      const submittedHoursResult = await sql`
        SELECT 
          COALESCE(SUM(total_regular_hours), 0) as regular,
          COALESCE(SUM(total_overtime_hours), 0) as overtime,
          COALESCE(SUM(total_double_time_hours), 0) as doubletime
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
        AND certified = true
        AND admin_approved = false
      `

      if (submittedHoursResult && submittedHoursResult.length > 0) {
        submittedRegularHours = Number.parseFloat(submittedHoursResult[0].regular || 0)
        submittedOvertimeHours = Number.parseFloat(submittedHoursResult[0].overtime || 0)
        submittedDoubleTimeHours = Number.parseFloat(submittedHoursResult[0].doubletime || 0)
      }
    } catch (e) {
      console.error("Error calculating submitted hours:", e)
    }

    const submittedHours = submittedRegularHours + submittedOvertimeHours + submittedDoubleTimeHours
    console.log(`Submitted hours: ${submittedHours}`)

    // 3. Approved Hours (certified and approved)
    let approvedRegularHours = 0
    let approvedOvertimeHours = 0
    let approvedDoubleTimeHours = 0
    try {
      const approvedHoursResult = await sql`
        SELECT 
          COALESCE(SUM(total_regular_hours), 0) as regular,
          COALESCE(SUM(total_overtime_hours), 0) as overtime,
          COALESCE(SUM(total_double_time_hours), 0) as doubletime
        FROM timesheets 
        WHERE DATE(week_start_date) = ${formattedStartDate}::date
        AND certified = true
        AND admin_approved = true
      `

      if (approvedHoursResult && approvedHoursResult.length > 0) {
        approvedRegularHours = Number.parseFloat(approvedHoursResult[0].regular || 0)
        approvedOvertimeHours = Number.parseFloat(approvedHoursResult[0].overtime || 0)
        approvedDoubleTimeHours = Number.parseFloat(approvedHoursResult[0].doubletime || 0)
      }
    } catch (e) {
      console.error("Error calculating approved hours:", e)
    }

    const approvedHours = approvedRegularHours + approvedOvertimeHours + approvedDoubleTimeHours
    console.log(`Approved hours: ${approvedHours}`)

    // Total hours (all categories)
    const totalHours = pendingHours + submittedHours + approvedHours
    const totalRegularHours = pendingRegularHours + submittedRegularHours + approvedRegularHours
    const totalOvertimeHours = pendingOvertimeHours + submittedOvertimeHours + approvedOvertimeHours
    const totalDoubleTimeHours = pendingDoubleTimeHours + submittedDoubleTimeHours + approvedDoubleTimeHours

    console.log(`Total hours: ${totalHours}`)

    // Count missing timesheets (hourly employees without a timesheet for this week)
    let missingTimesheets = 0
    try {
      // Get all active hourly employees who have NOT submitted a timesheet for this week
      const missingTimesheetsResult = await sql`
        SELECT COUNT(*) as count
        FROM users u
        WHERE u.is_admin = false
        AND u.is_active = true
        AND u.employee_type = 'hourly'
        AND NOT EXISTS (
          SELECT 1 FROM timesheets t
          WHERE t.user_id = u.id
          AND DATE(t.week_start_date) = ${formattedStartDate}::date
        )
      `

      if (missingTimesheetsResult && missingTimesheetsResult.length > 0) {
        missingTimesheets = Number.parseInt(missingTimesheetsResult[0].count, 10) || 0
      }
      console.log(`Missing timesheets: ${missingTimesheets}`)
    } catch (e) {
      console.error("Error counting missing timesheets:", e)
    }

    // Return the statistics
    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        hourlyEmployees,
        timesheetsCreated,
        timesheetsCertified,
        pendingApproval,
        totalHours,
        totalSalary: 0, // Default to 0 since we're not calculating this
        regularHours: totalRegularHours,
        overtimeHours: totalOvertimeHours,
        doubleTimeHours: totalDoubleTimeHours,
        pendingHours,
        submittedHours,
        approvedHours,
        missingTimesheets,
      },
    })
  } catch (error) {
    console.error("Error fetching admin statistics:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch statistics: " + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

