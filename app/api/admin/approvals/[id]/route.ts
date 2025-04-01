import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { approved, approvedBy } = await request.json()

    console.log(`Updating approval status for timesheet ID: ${id}, approved: ${approved}, approvedBy: ${approvedBy}`)

    // Check if admin_approved column exists
    let adminApprovedExists = false
    try {
      const checkColumn = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'timesheets'
          AND column_name = 'admin_approved'
        );
      `

      adminApprovedExists =
        checkColumn && checkColumn.rows && checkColumn.rows.length > 0 && checkColumn.rows[0].exists === true
      console.log(`admin_approved column exists: ${adminApprovedExists}`)
    } catch (error) {
      console.error("Error checking for admin_approved column:", error)
      adminApprovedExists = false
    }

    // If the column doesn't exist, add it
    if (!adminApprovedExists) {
      try {
        console.log("Adding admin_approved, approval_date, and approved_by columns to timesheets table")
        await sql`
          ALTER TABLE timesheets 
          ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)
        `
        adminApprovedExists = true
      } catch (error) {
        console.error("Error adding admin_approved column:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Failed to add admin_approved column: " + (error instanceof Error ? error.message : String(error)),
          },
          { status: 500 },
        )
      }
    }

    // Update the timesheet approval status
    const result = await sql`
      UPDATE timesheets
      SET admin_approved = ${approved},
          approval_date = ${approved ? new Date() : null},
          approved_by = ${approved ? approvedBy : null}
      WHERE id = ${id}
      RETURNING id, user_id, week_start_date, status, certified, admin_approved, approval_date, approved_by
    `

    console.log("Update result:", result)

    // Check if the timesheet was found and updated
    let updatedTimesheet = null
    if (Array.isArray(result) && result.length > 0) {
      updatedTimesheet = result[0]
    } else if (result?.rows && result.rows.length > 0) {
      updatedTimesheet = result.rows[0]
    }

    if (!updatedTimesheet) {
      return NextResponse.json(
        { success: false, message: "Timesheet not found or could not be updated" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: approved ? "Timesheet approved successfully" : "Timesheet approval removed",
      data: updatedTimesheet,
    })
  } catch (error) {
    console.error("Error updating timesheet approval:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update timesheet approval: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

