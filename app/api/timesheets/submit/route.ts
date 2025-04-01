import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

// Helper function to round to nearest minute
function roundToNearestMinute(timeString1: string, timeString2: string): number {
  const time1 = new Date(`2000-01-01T${timeString1}`)
  const time2 = new Date(`2000-01-01T${timeString2}`)

  // Calculate duration in milliseconds
  const durationMs = Math.abs(time2.getTime() - time1.getTime())

  // Convert to minutes and round to nearest minute
  return Math.round(durationMs / (1000 * 60))
}

// Helper function to determine if a break should be deducted
function shouldDeductBreak(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false

  const durationMinutes = roundToNearestMinute(startTime, endTime)
  return durationMinutes > 10
}

// Helper function to calculate total hours worked
function calculateDailyHours(day: any): number {
  if (!day.startTime || !day.endTime) return 0

  // Calculate total work duration
  const totalMinutes = roundToNearestMinute(day.startTime, day.endTime)
  let totalHours = totalMinutes / 60

  // Deduct lunch break (always deducted if present)
  if (day.lunchBreakStart && day.lunchBreakEnd) {
    const lunchMinutes = roundToNearestMinute(day.lunchBreakStart, day.lunchBreakEnd)
    totalHours -= lunchMinutes / 60
  }

  // Check AM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.amBreakStart && day.amBreakEnd) {
    const amBreakMinutes = roundToNearestMinute(day.amBreakStart, day.amBreakEnd)

    if (amBreakMinutes > 10) {
      const amBreakHours = amBreakMinutes / 60
      totalHours -= amBreakHours
      console.log(`AM break exceeds 10 minutes (${amBreakMinutes} min). Subtracting ${amBreakHours.toFixed(2)} hours.`)
    } else {
      console.log(`AM break within 10 minutes (${amBreakMinutes} min). Not deducting.`)
    }
  }

  // Check PM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.pmBreakStart && day.pmBreakEnd) {
    const pmBreakMinutes = roundToNearestMinute(day.pmBreakStart, day.pmBreakEnd)

    if (pmBreakMinutes > 10) {
      const pmBreakHours = pmBreakMinutes / 60
      totalHours -= pmBreakHours
      console.log(`PM break exceeds 10 minutes (${pmBreakMinutes} min). Subtracting ${pmBreakHours.toFixed(2)} hours.`)
    } else {
      console.log(`PM break within 10 minutes (${pmBreakMinutes} min). Not deducting.`)
    }
  }

  // Round to 2 decimal places
  return Math.round(totalHours * 100) / 100
}

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

