import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser, isAdmin } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { employeeId, weekStartDate } = await request.json()

    if (!employeeId || !weekStartDate) {
      return NextResponse.json(
        { success: false, message: "Employee ID and week start date are required" },
        { status: 400 },
      )
    }

    console.log(`Creating timesheet for employee ${employeeId} for week starting: ${weekStartDate}`)

    // Check if a timesheet already exists for this employee and week
    const existingTimesheet = await sql`
     SELECT id FROM timesheets
     WHERE user_id = ${employeeId}
     AND DATE(week_start_date) = ${weekStartDate}::date
   `

    if (existingTimesheet && existingTimesheet.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A timesheet already exists for this employee and week",
          timesheetId: existingTimesheet[0].id,
        },
        { status: 409 },
      )
    }

    // Get employee details
    const employeeResult = await sql`
     SELECT id, full_name
     FROM users
     WHERE id = ${employeeId}
   `

    if (!employeeResult || employeeResult.length === 0) {
      return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 })
    }

    const employee = employeeResult[0]

    // Create the timesheet
    const timesheetResult = await sql`
     INSERT INTO timesheets (
       user_id,
       week_start_date,
       status,
       certified,
       total_regular_hours,
       total_overtime_hours,
       total_double_time_hours
     )
     VALUES (
       ${employeeId},
       ${weekStartDate}::date,
       'draft',
       false,
       0,
       0,
       0
     )
     RETURNING id
   `

    if (!timesheetResult || timesheetResult.length === 0) {
      throw new Error("Failed to create timesheet")
    }

    const timesheetId = timesheetResult[0].id

    // Create timesheet days (all days of the week)
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    for (let i = 0; i < dayNames.length; i++) {
      const dayName = dayNames[i]
      const isWeekend = i >= 5 // Saturday and Sunday

      await sql`
       INSERT INTO timesheet_days (
         timesheet_id,
         day_name,
         did_not_work,
         total_regular_hours,
         total_overtime_hours,
         total_double_time_hours,
         is_seventh_consecutive_day,
         location
       )
       VALUES (
         ${timesheetId},
         ${dayName},
         ${isWeekend},
         0,
         0,
         0,
         false,
         'sf'
       )
     `
    }

    // Add an audit log entry
    await sql`
     INSERT INTO audit_logs (
       user_id,
       action,
       entity_type,
       entity_id,
       details,
       created_at
     )
     VALUES (
       ${currentUser.id},
       'create',
       'timesheet',
       ${timesheetId},
       ${"Admin created timesheet"},
       NOW()
     )
   `

    return NextResponse.json({
      success: true,
      message: "Timesheet created successfully",
      timesheetId,
    })
  } catch (error) {
    console.error("Error creating timesheet:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create timesheet: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

