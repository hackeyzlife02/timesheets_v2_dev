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

    console.log(`Creating salaried timesheet for employee ${employeeId} for week starting: ${weekStartDate}`)

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

    // Get employee details to calculate salary
    const employeeResult = await sql`
      SELECT id, full_name, weekly_salary
      FROM users
      WHERE id = ${employeeId}
    `

    if (!employeeResult || employeeResult.length === 0) {
      return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 })
    }

    const employee = employeeResult[0]
    const weeklySalary = Number(employee.weekly_salary) || 0

    // Calculate daily salary (weekly salary / 5 workdays)
    const dailySalary = weeklySalary / 5

    // Create the timesheet
    const timesheetResult = await sql`
      INSERT INTO timesheets (
        user_id,
        week_start_date,
        status,
        certified,
        submission_date,
        admin_approved,
        total_regular_hours,
        total_overtime_hours,
        total_double_time_hours,
        sf_hours,
        out_of_town_hours,
        sick_hours,
        holiday_hours,
        vacation_hours,
        weekly_salary,
        is_salaried
      )
      VALUES (
        ${employeeId},
        ${weekStartDate}::date,
        'certified',
        true,
        NOW(),
        false,
        40, -- Standard 40-hour work week for salaried employees
        0,
        0,
        40, -- Default all hours to SF
        0,
        0,
        0,
        0,
        ${weeklySalary},
        true
      )
      RETURNING id
    `

    if (!timesheetResult || timesheetResult.length === 0) {
      throw new Error("Failed to create timesheet")
    }

    const timesheetId = timesheetResult[0].id

    // Create timesheet days (Monday to Friday with 8 hours each)
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
          location,
          daily_salary
        )
        VALUES (
          ${timesheetId},
          ${dayName},
          ${isWeekend},
          ${isWeekend ? 0 : 8}, -- 8 hours for weekdays, 0 for weekends
          0,
          0,
          false,
          'sf',
          ${isWeekend ? 0 : dailySalary}
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
        ${"Admin created salaried timesheet"},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Salaried timesheet created successfully",
      timesheetId,
    })
  } catch (error) {
    console.error("Error creating salaried timesheet:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create salaried timesheet: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

