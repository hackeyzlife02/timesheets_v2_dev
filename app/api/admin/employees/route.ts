import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching employee statistics...")

    let tableColumns = []

    try {
      // First, let's check if the users table exists and what columns it has
      const tableInfo = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `

      if (tableInfo && tableInfo.rows) {
        tableColumns = tableInfo.rows.map((r) => r.column_name)
        console.log("Users table columns:", tableColumns)
      } else {
        console.log("No table info returned")
      }
    } catch (e) {
      console.error("Error fetching table info:", e)
    }

    // Get total number of users
    let totalUsers = 0
    try {
      const totalUsersResult = await sql`
        SELECT COUNT(*) as count 
        FROM users
      `

      if (totalUsersResult && totalUsersResult.rows && totalUsersResult.rows.length > 0) {
        totalUsers = Number.parseInt(totalUsersResult.rows[0].count || "0", 10)
        console.log(`Total users: ${totalUsers}`)
      } else {
        console.log("No user count result returned")
      }
    } catch (e) {
      console.error("Error counting users:", e)
    }

    // Get total number of active employees (non-admin users)
    let activeEmployees = 0
    try {
      const activeEmployeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true
      `

      if (activeEmployeesResult && activeEmployeesResult.rows && activeEmployeesResult.rows.length > 0) {
        activeEmployees = Number.parseInt(activeEmployeesResult.rows[0].count || "0", 10)
        console.log(`Active employees: ${activeEmployees}`)
      } else {
        console.log("No active employees result returned")
      }
    } catch (e) {
      console.error("Error counting active employees:", e)
    }

    // Check if employment_type column exists
    const hasEmploymentType = tableColumns.includes("employment_type")

    let hourlyEmployees = 0
    let salaryEmployees = 0

    if (hasEmploymentType) {
      try {
        // Get hourly employees
        const hourlyResult = await sql`
          SELECT COUNT(*) as count 
          FROM users 
          WHERE is_admin = false 
          AND is_active = true
          AND employment_type = 'hourly'
        `

        if (hourlyResult && hourlyResult.rows && hourlyResult.rows.length > 0) {
          hourlyEmployees = Number.parseInt(hourlyResult.rows[0].count || "0", 10)
        }

        // Get salary employees
        const salaryResult = await sql`
          SELECT COUNT(*) as count 
          FROM users 
          WHERE is_admin = false 
          AND is_active = true
          AND employment_type = 'salary'
        `

        if (salaryResult && salaryResult.rows && salaryResult.rows.length > 0) {
          salaryEmployees = Number.parseInt(salaryResult.rows[0].count || "0", 10)
        }
      } catch (e) {
        console.error("Error counting employment types:", e)
      }
    } else {
      console.log("employment_type column not found in users table")
    }

    // Return the statistics
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeEmployees,
        hourlyEmployees,
        salaryEmployees,
        hasEmploymentTypeColumn: hasEmploymentType,
        tableColumns,
      },
    })
  } catch (error) {
    console.error("Error fetching employee statistics:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee statistics: " + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

