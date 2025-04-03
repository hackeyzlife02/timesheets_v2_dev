import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateDailyHours } from "@/lib/timesheet-calculations"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    const { timesheetId, days, weekStartDate, weekEndDate, status } = data

    // Calculate total hours for each day
    let totalHours = 0

    for (const day of days) {
      const dailyHours = calculateDailyHours(day)
      totalHours += dailyHours

      // Update or insert daily entries
      await sql`
        INSERT INTO timesheet_days (
          timesheet_id, 
          day_date, 
          start_time, 
          end_time, 
          lunch_break_start, 
          lunch_break_end, 
          am_break_start, 
          am_break_end, 
          pm_break_start, 
          pm_break_end, 
          hours_worked
        ) 
        VALUES (
          ${timesheetId}, 
          ${day.date}, 
          ${day.startTime || null}, 
          ${day.endTime || null}, 
          ${day.lunchBreakStart || null}, 
          ${day.lunchBreakEnd || null}, 
          ${day.amBreakStart || null}, 
          ${day.amBreakEnd || null}, 
          ${day.pmBreakStart || null}, 
          ${day.pmBreakEnd || null}, 
          ${dailyHours}
        )
        ON CONFLICT (timesheet_id, day_date) 
        DO UPDATE SET
          start_time = ${day.startTime || null}, 
          end_time = ${day.endTime || null}, 
          lunch_break_start = ${day.lunchBreakStart || null}, 
          lunch_break_end = ${day.lunchBreakEnd || null}, 
          am_break_start = ${day.amBreakStart || null}, 
          am_break_end = ${day.amBreakEnd || null}, 
          pm_break_start = ${day.pmBreakStart || null}, 
          pm_break_end = ${day.pmBreakEnd || null}, 
          hours_worked = ${dailyHours}
      `
    }

    // Update timesheet with total hours and status
    await sql`
      UPDATE timesheets 
      SET 
        total_hours = ${totalHours}, 
        status = ${status}, 
        updated_at = NOW() 
      WHERE id = ${timesheetId}
    `

    return NextResponse.json({
      success: true,
      message: "Timesheet updated successfully",
      totalHours,
    })
  } catch (error) {
    console.error("Error submitting timesheet:", error)
    return NextResponse.json({ error: "Failed to submit timesheet" }, { status: 500 })
  }
}

