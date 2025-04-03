import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date") // Get the date from query params

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 })
    }

    console.log("Fetching active timesheet for:", { userId, date })

    // Query for any timesheet in the specified week (not just draft status)
    const result = await sql`
      SELECT 
        id, 
        user_id, 
        week_start_date, 
        status, 
        certified, 
        submission_date,
        total_regular_hours, 
        total_overtime_hours, 
        total_double_time_hours,
        created_at,
        updated_at,
        admin_approved,
        approval_date,
        approved_by
      FROM 
        timesheets
      WHERE 
        user_id = ${userId} 
        AND DATE(week_start_date) = ${date}
      LIMIT 1
    `

    console.log("Active timesheet query result:", result)

    if (result && result.length > 0) {
      const timesheet = result[0]

      // Calculate week end date
      const weekStartDate = new Date(timesheet.week_start_date)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekStartDate.getDate() + 6)

      // Add calculated fields
      timesheet.weekEndDate = weekEndDate.toISOString().split("T")[0]

      return NextResponse.json({
        success: true,
        timesheet,
      })
    }

    return NextResponse.json({
      success: true,
      timesheet: null,
    })
  } catch (error) {
    console.error("Error fetching active timesheet:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch active timesheet" }, { status: 500 })
  }
}

