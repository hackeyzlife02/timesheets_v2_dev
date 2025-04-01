import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    console.log(`Fetching timesheet with ID: ${id} for admin review`)

    // Check if admin_approved column exists
    let adminApprovedExists = false
    try {
      const checkColumn = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'timesheets' 
        AND column_name = 'admin_approved'
      `

      adminApprovedExists = checkColumn.rows && checkColumn.rows.length > 0
      console.log(`admin_approved column exists: ${adminApprovedExists}`)
    } catch (error) {
      console.error("Error checking for admin_approved column:", error)
    }

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

    if (adminApprovedExists && employeeTypeExists && weeklySalaryExists) {
      query = sql`
        SELECT 
          t.id,
          t.user_id as "userId",
          t.week_start_date as "weekStartDate",
          t.status,
          t.certified,
          t.submission_date as "submissionDate",
          t.admin_approved as "adminApproved",
          t.approval_date as "approvalDate",
          t.approved_by as "approvedBy",
          t.total_regular_hours as "totalRegularHours",
          t.total_overtime_hours as "totalOvertimeHours",
          t.total_double_time_hours as "totalDoubleTimeHours",
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          u.full_name as "employeeName",
          u.email as "employeeEmail",
          u.employee_type as "employeeType",
          u.weekly_salary as "weeklySalary"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ${id}
      `
    } else if (adminApprovedExists) {
      query = sql`
        SELECT 
          t.id,
          t.user_id as "userId",
          t.week_start_date as "weekStartDate",
          t.status,
          t.certified,
          t.submission_date as "submissionDate",
          t.admin_approved as "adminApproved",
          t.approval_date as "approvalDate",
          t.approved_by as "approvedBy",
          t.total_regular_hours as "totalRegularHours",
          t.total_overtime_hours as "totalOvertimeHours",
          t.total_double_time_hours as "totalDoubleTimeHours",
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          u.full_name as "employeeName",
          u.email as "employeeEmail"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ${id}
      `
    } else if (employeeTypeExists && weeklySalaryExists) {
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
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          u.full_name as "employeeName",
          u.email as "employeeEmail",
          u.employee_type as "employeeType",
          u.weekly_salary as "weeklySalary"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ${id}
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
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          u.full_name as "employeeName",
          u.email as "employeeEmail"
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ${id}
      `
    }

    const timesheetResult = await query

    if (!timesheetResult.rows || timesheetResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Timesheet not found" }, { status: 404 })
    }

    const timesheet = timesheetResult.rows[0]

    // Get the timesheet days
    const daysResult = await sql`
      SELECT 
        id,
        day_name as "dayName",
        did_not_work as "didNotWork",
        time_in as "timeIn",
        time_out as "timeOut",
        meal_break_start as "mealBreakStart",
        meal_break_end as "mealBreakEnd",
        am_break_start as "amBreakStart",
        am_break_end as "amBreakEnd",
        pm_break_start as "pmBreakStart",
        pm_break_end as "pmBreakEnd",
        out_of_town_hours as "outOfTownHours",
        out_of_town_minutes as "outOfTownMinutes",
        reasons,
        total_regular_hours as "totalRegularHours",
        total_overtime_hours as "totalOvertimeHours",
        total_double_time_hours as "totalDoubleTimeHours",
        is_seventh_consecutive_day as "isSeventhConsecutiveDay"
      FROM timesheet_days
      WHERE timesheet_id = ${id}
    `

    // Convert days array to object with day names as keys
    const days: { [key: string]: any } = {}

    for (const day of daysResult.rows) {
      days[day.dayName] = {
        didNotWork: day.didNotWork,
        timeIn: day.timeIn || "",
        timeOut: day.timeOut || "",
        mealBreakStart: day.mealBreakStart || "",
        mealBreakEnd: day.mealBreakEnd || "",
        amBreakStart: day.amBreakStart || "",
        amBreakEnd: day.amBreakEnd || "",
        pmBreakStart: day.pmBreakStart || "",
        pmBreakEnd: day.pmBreakEnd || "",
        outOfTownHours: day.outOfTownHours || 0,
        outOfTownMinutes: day.outOfTownMinutes || 0,
        reasons: day.reasons || "",
        totalRegularHours: day.totalRegularHours || 0,
        totalOvertimeHours: day.totalOvertimeHours || 0,
        totalDoubleTimeHours: day.totalDoubleTimeHours || 0,
        isSeventhConsecutiveDay: day.isSeventhConsecutiveDay || false,
      }
    }

    // Add default values for missing fields
    const timesheetWithDefaults = {
      ...timesheet,
      adminApproved: timesheet.adminApproved || false,
      approvalDate: timesheet.approvalDate || null,
      approvedBy: timesheet.approvedBy || null,
      employeeType: timesheet.employeeType || "hourly",
      weeklySalary: timesheet.weeklySalary || 0,
    }

    // Return the timesheet with days
    return NextResponse.json({
      success: true,
      data: {
        ...timesheetWithDefaults,
        days,
      },
    })
  } catch (error) {
    console.error("Error fetching timesheet for admin review:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch timesheet: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

