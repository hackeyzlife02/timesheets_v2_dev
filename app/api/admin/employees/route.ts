import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser, isAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN EMPLOYEES API CALLED ===")

    // Check if user is admin
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Create a fresh SQL client for this request
    const sql = neon(process.env.DATABASE_URL!)

    // Get query parameters
    const url = new URL(request.url)
    const employeeType = url.searchParams.get("type")

    // Build the query based on the employee type filter
    let query = `
      SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_admin, 
        is_active, 
        employee_type,
        weekly_salary
      FROM users 
      WHERE is_admin = false 
      AND is_active = true
    `

    if (employeeType) {
      query += ` AND employee_type = '${employeeType}'`
    }

    query += ` ORDER BY full_name`

    const employees = await sql.unsafe(query)
    console.log(`Found ${employees.length} employees${employeeType ? ` with type ${employeeType}` : ""}`)

    return NextResponse.json({
      success: true,
      data: employees,
    })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employees: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

