import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { timesheet, updatedBy } = await request.json()

    console.log(`Updating timesheet with ID: ${id}`)

    // Update the timesheet record
    await sql`
      UPDATE timesheets
      SET 
        total_regular_hours = ${timesheet.totalRegularHours || 0},
        total_overtime_hours = ${timesheet.totalOvertimeHours || 0},
        total_double_time_hours = ${timesheet.totalDoubleTimeHours || 0},
        sf_hours = ${timesheet.sfHours || 0},
        out_of_town_hours = ${timesheet.outOfTownHours || 0},
        sick_hours = ${timesheet.sickHours || 0},
        holiday_hours = ${timesheet.holidayHours || 0},
        vacation_hours = ${timesheet.vacationHours || 0},
        admin_notes = ${timesheet.adminNotes || ""},
        updated_at = NOW(),
        last_updated_by = ${updatedBy || null}
      WHERE id = ${id}
    `

    // Update each day
    for (const [dayName, day] of Object.entries(timesheet.days)) {
      await sql`
        UPDATE timesheet_days
        SET 
          did_not_work = ${day.didNotWork || false},
          time_in = ${day.timeIn || null},
          time_out = ${day.timeOut || null},
          meal_break_start = ${day.mealBreakStart || null},
          meal_break_end = ${day.mealBreakEnd || null},
          am_break_start = ${day.amBreakStart || null},
          am_break_end = ${day.amBreakEnd || null},
          pm_break_start = ${day.pmBreakStart || null},
          pm_break_end = ${day.pmBreakEnd || null},
          out_of_town_hours = ${day.outOfTownHours || 0},
          out_of_town_minutes = ${day.outOfTownMinutes || 0},
          reasons = ${day.notes || day.reasons || ""},
          total_regular_hours = ${day.totalRegularHours || 0},
          total_overtime_hours = ${day.totalOvertimeHours || 0},
          total_double_time_hours = ${day.totalDoubleTimeHours || 0},
          is_seventh_consecutive_day = ${day.isSeventhConsecutiveDay || false},
          location = ${day.location || "sf"},
          time_off_type = ${day.timeOffType || null},
          status = ${day.status || "normal"}
        WHERE timesheet_id = ${id} AND day_name = ${dayName}
      `
    }

    // Delete existing expenses
    await sql`
      DELETE FROM timesheet_expenses
      WHERE timesheet_id = ${id}
    `

    // Insert new expenses
    if (timesheet.expenses && timesheet.expenses.length > 0) {
      for (const expense of timesheet.expenses) {
        await sql`
          INSERT INTO timesheet_expenses (
            timesheet_id, 
            description, 
            amount, 
            created_at
          )
          VALUES (
            ${id}, 
            ${expense.description || ""}, 
            ${expense.amount || 0}, 
            NOW()
          )
        `
      }
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
        ${updatedBy},
        'update',
        'timesheet',
        ${id},
        ${"Admin updated timesheet"},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Timesheet updated successfully",
    })
  } catch (error) {
    console.error("Error updating timesheet:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update timesheet: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

