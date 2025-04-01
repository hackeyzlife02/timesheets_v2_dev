import { type NextRequest, NextResponse } from "next/server"
import { getTimesheetById, saveTimesheet, deleteTimesheet } from "@/lib/timesheet"

// GET /api/timesheets/[id] - Get a timesheet by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const timesheet = await getTimesheetById(id)

    if (!timesheet) {
      return NextResponse.json({ success: false, message: "Timesheet not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: timesheet })
  } catch (error) {
    console.error("Error fetching timesheet:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch timesheet" }, { status: 500 })
  }
}

// PUT /api/timesheets/[id] - Update a timesheet
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const timesheetData = await request.json()

    // Ensure the ID in the URL matches the ID in the data
    timesheetData.id = id

    const result = await saveTimesheet(timesheetData)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      id: result.id,
    })
  } catch (error) {
    console.error("Error updating timesheet:", error)
    return NextResponse.json({ success: false, message: "Failed to update timesheet" }, { status: 500 })
  }
}

// DELETE /api/timesheets/[id] - Delete a timesheet
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const result = await deleteTimesheet(id)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error("Error deleting timesheet:", error)
    return NextResponse.json({ success: false, message: "Failed to delete timesheet" }, { status: 500 })
  }
}

