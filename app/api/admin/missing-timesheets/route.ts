import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN MISSING TIMESHEETS API CALLED ===")

    // Create SQL client - use the same approach as in other working endpoints
    const sql = neon(process.env.DATABASE_URL!)

    // Get the week start date from the query parameters
    const url = new URL(request.url)
    const weekStartDateParam = url.searchParams.get("weekStartDate")

    // If no date provided, use the current week's Monday
    let weekStartDate: Date
    if (weekStartDateParam) {
      weekStartDate = new Date(weekStartDateParam)
    } else {
      weekStartDate = getStartOfWeek()
    }

    // Format the date for SQL query
    const formattedDate = weekStartDate.toISOString().split("T")[0]
    console.log(`Fetching missing timesheets for week starting: ${formattedDate}`)

    // Get all active hourly employees
    const hourlyEmployees = await sql`
      SELECT id, username, full_name, email
      FROM users
      WHERE is_admin = false
      AND is_active = true
      AND employee_type = 'hourly'
      ORDER BY full_name
    `

    console.log(`Found ${hourlyEmployees.length} hourly employees`)

    // Get all timesheets for the current week
    const timesheets = await sql`
      SELECT user_id
      FROM timesheets
      WHERE DATE(week_start_date) = ${formattedDate}::date
    `

    console.log(`Found ${timesheets.length} timesheets for the week`)

    // Create a set of user IDs who have submitted timesheets
    const submittedUserIds = new Set(timesheets.map((t) => t.user_id))

    // Filter out employees who have already submitted timesheets
    const missingTimesheets = hourlyEmployees.filter((employee) => !submittedUserIds.has(employee.id))

    console.log(`Found ${missingTimesheets.length} employees missing timesheets`)

    return NextResponse.json({
      success: true,
      data: {
        weekStartDate: formattedDate,
        employees: missingTimesheets,
      },
    })
  } catch (error) {
    console.error("Error fetching missing timesheets:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch missing timesheets: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

// Helper function to get the start of the current week (Monday)
function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  return monday
}

