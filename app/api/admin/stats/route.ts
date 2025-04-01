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

    // Parse the date and ensure it's in the correct format for PostgreSQL
    const weekStartDate = new Date(weekStartDateParam)
    const formattedStartDate = weekStartDate.toISOString().split("T")[0] // YYYY-MM-DD format

    // Calculate the end of the week (7 days later)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 7)
    const formattedEndDate = weekEndDate.toISOString().split("T")[0] // YYYY-MM-DD format

    console.log(`Fetching stats for week: ${formattedStartDate} to ${formattedEndDate}`)

    try {
      // Debug: Check the structure of the timesheets table
      const tableStructure = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'timesheets'
      `
      console.log(
        "Debug - Timesheet table structure:",
        tableStructure?.rows ? JSON.stringify(tableStructure.rows) : "No data",
      )
    } catch (e) {
      console.error("Error checking table structure:", e)
    }

    try {
      // Debug: Check what's in the database for this week
      const debugTimesheets = await sql`
        SELECT * 
        FROM timesheets 
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        LIMIT 1
      `

      if (debugTimesheets?.rows && debugTimesheets.rows.length > 0) {
        console.log("Debug - Sample timesheet columns:", Object.keys(debugTimesheets.rows[0]))
      } else {
        console.log("Debug - No timesheets found for the specified week")
      }
    } catch (e) {
      console.error("Error checking sample timesheet:", e)
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

      if (employeesResult?.rows && employeesResult.rows.length > 0) {
        totalEmployees = Number.parseInt(employeesResult.rows[0].count, 10) || 0
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
      `

      if (timesheetsCreatedResult?.rows && timesheetsCreatedResult.rows.length > 0) {
        timesheetsCreated = Number.parseInt(timesheetsCreatedResult.rows[0].count, 10) || 0
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        AND certified = true
      `

      if (timesheetsCertifiedResult?.rows && timesheetsCertifiedResult.rows.length > 0) {
        timesheetsCertified = Number.parseInt(timesheetsCertifiedResult.rows[0].count, 10) || 0
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        AND certified = true
        AND admin_approved = false
      `

      if (pendingApprovalResult?.rows && pendingApprovalResult.rows.length > 0) {
        pendingApproval = Number.parseInt(pendingApprovalResult.rows[0].count, 10) || 0
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        AND certified = false
      `

      if (pendingHoursResult?.rows && pendingHoursResult.rows.length > 0) {
        pendingRegularHours = Number.parseFloat(pendingHoursResult.rows[0].regular || 0)
        pendingOvertimeHours = Number.parseFloat(pendingHoursResult.rows[0].overtime || 0)
        pendingDoubleTimeHours = Number.parseFloat(pendingHoursResult.rows[0].doubletime || 0)
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        AND certified = true
        AND admin_approved = false
      `

      if (submittedHoursResult?.rows && submittedHoursResult.rows.length > 0) {
        submittedRegularHours = Number.parseFloat(submittedHoursResult.rows[0].regular || 0)
        submittedOvertimeHours = Number.parseFloat(submittedHoursResult.rows[0].overtime || 0)
        submittedDoubleTimeHours = Number.parseFloat(submittedHoursResult.rows[0].doubletime || 0)
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
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
        AND certified = true
        AND admin_approved = true
      `

      if (approvedHoursResult?.rows && approvedHoursResult.rows.length > 0) {
        approvedRegularHours = Number.parseFloat(approvedHoursResult.rows[0].regular || 0)
        approvedOvertimeHours = Number.parseFloat(approvedHoursResult.rows[0].overtime || 0)
        approvedDoubleTimeHours = Number.parseFloat(approvedHoursResult.rows[0].doubletime || 0)
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

    // Return the statistics
    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
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

