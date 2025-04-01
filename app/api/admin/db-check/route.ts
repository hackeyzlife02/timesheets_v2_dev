import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get the week start date from the query parameters
    const searchParams = request.nextUrl.searchParams
    const weekStartDateParam = searchParams.get("weekStartDate") || "2025-03-31"

    // Format the date for PostgreSQL
    const formattedStartDate = new Date(weekStartDateParam).toISOString().split("T")[0]

    // Calculate the end of the week (7 days later)
    const weekEndDate = new Date(formattedStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 7)
    const formattedEndDate = weekEndDate.toISOString().split("T")[0]

    const result = {
      tables: [],
      timesheetColumns: [],
      timesheets: [],
      users: [],
      days: [],
      weekTimesheets: [],
      queryParams: {
        weekStartDate: formattedStartDate,
        weekEndDate: formattedEndDate,
      },
    }

    try {
      // Get table structure
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      if (tablesResult?.rows) {
        result.tables = tablesResult.rows.map((row) => row.table_name)
      }
    } catch (e) {
      console.error("Error getting tables:", e)
    }

    try {
      // Get timesheet table structure
      const timesheetColumnsResult = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'timesheets'
      `
      if (timesheetColumnsResult?.rows) {
        result.timesheetColumns = timesheetColumnsResult.rows
      }
    } catch (e) {
      console.error("Error getting timesheet columns:", e)
    }

    try {
      // Check timesheets table
      const timesheetsResult = await sql`
        SELECT * 
        FROM timesheets 
        ORDER BY week_start_date DESC
        LIMIT 10
      `
      if (timesheetsResult?.rows) {
        result.timesheets = timesheetsResult.rows
      }
    } catch (e) {
      console.error("Error getting timesheets:", e)
    }

    try {
      // Check users table
      const usersResult = await sql`
        SELECT id, username, email, is_admin, is_active
        FROM users
        LIMIT 10
      `
      if (usersResult?.rows) {
        result.users = usersResult.rows
      }
    } catch (e) {
      console.error("Error getting users:", e)
    }

    try {
      // Check timesheet_days table
      const daysResult = await sql`
        SELECT * 
        FROM timesheet_days
        LIMIT 10
      `
      if (daysResult?.rows) {
        result.days = daysResult.rows
      }
    } catch (e) {
      console.error("Error getting timesheet days:", e)
    }

    try {
      // Check specific week
      const weekResult = await sql`
        SELECT * 
        FROM timesheets 
        WHERE week_start_date >= ${formattedStartDate}::date 
        AND week_start_date < ${formattedEndDate}::date
      `
      if (weekResult?.rows) {
        result.weekTimesheets = weekResult.rows
      }
    } catch (e) {
      console.error("Error getting week timesheets:", e)
    }

    // Return the data
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error checking database:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check database: " + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

