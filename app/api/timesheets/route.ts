import { type NextRequest, NextResponse } from "next/server"
import { getTimesheets, saveTimesheet } from "@/lib/timesheet"

// GET /api/timesheets - Get all timesheets for the current user
export async function GET(request: NextRequest) {
  try {
    // In a real app, you would get the user ID from the session/token
    // For now, we'll use a query parameter
    const userId = Number.parseInt(request.nextUrl.searchParams.get("userId") || "1")

    const timesheets = await getTimesheets(userId)

    return NextResponse.json({ success: true, data: timesheets })
  } catch (error) {
    console.error("Error fetching timesheets:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch timesheets" }, { status: 500 })
  }
}

// POST /api/timesheets - Create a new timesheet
export async function POST(request: NextRequest) {
  try {
    const timesheetData = await request.json()

    const result = await saveTimesheet(timesheetData)

    if (!result.success) {
      // If it's a duplicate timesheet, return a specific status code
      if (result.duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: result.message,
            duplicate: true,
          },
          { status: 409 },
        ) // 409 Conflict is appropriate for duplicates
      }

      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      id: result.id,
    })
  } catch (error) {
    console.error("Error creating timesheet:", error)
    return NextResponse.json({ success: false, message: "Failed to create timesheet" }, { status: 500 })
  }
}

