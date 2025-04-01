import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN EMPLOYEES API CALLED ===")

    // Create a fresh SQL client for this request - using the same approach that worked for stats
    const sql = neon(process.env.DATABASE_URL!)

    // Get total users count
    let totalUsers = 0
    try {
      const totalUsersResult = await sql`SELECT COUNT(*) as count FROM users`
      if (totalUsersResult && totalUsersResult.length > 0) {
        totalUsers = Number.parseInt(totalUsersResult[0].count, 10) || 0
      }
      console.log(`Total users: ${totalUsers}`)
    } catch (e) {
      console.error("Error counting total users:", e)
    }

    // Get non-admin users count
    let nonAdminUsers = 0
    try {
      const nonAdminUsersResult = await sql`SELECT COUNT(*) as count FROM users WHERE is_admin = false`
      if (nonAdminUsersResult && nonAdminUsersResult.length > 0) {
        nonAdminUsers = Number.parseInt(nonAdminUsersResult[0].count, 10) || 0
      }
      console.log(`Non-admin users: ${nonAdminUsers}`)
    } catch (e) {
      console.error("Error counting non-admin users:", e)
    }

    // Get active users count
    let activeUsers = 0
    try {
      const activeUsersResult = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`
      if (activeUsersResult && activeUsersResult.length > 0) {
        activeUsers = Number.parseInt(activeUsersResult[0].count, 10) || 0
      }
      console.log(`Active users: ${activeUsers}`)
    } catch (e) {
      console.error("Error counting active users:", e)
    }

    // Get active employees count (non-admin, active)
    let activeEmployees = 0
    try {
      const activeEmployeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true
      `
      if (activeEmployeesResult && activeEmployeesResult.length > 0) {
        activeEmployees = Number.parseInt(activeEmployeesResult[0].count, 10) || 0
      }
      console.log(`Active employees: ${activeEmployees}`)
    } catch (e) {
      console.error("Error counting active employees:", e)
    }

    // Get hourly employees count
    let hourlyEmployees = 0
    try {
      const hourlyEmployeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true 
        AND employee_type = 'hourly'
      `
      if (hourlyEmployeesResult && hourlyEmployeesResult.length > 0) {
        hourlyEmployees = Number.parseInt(hourlyEmployeesResult[0].count, 10) || 0
      }
      console.log(`Hourly employees: ${hourlyEmployees}`)
    } catch (e) {
      console.error("Error counting hourly employees:", e)
    }

    // Get salary employees count
    let salaryEmployees = 0
    try {
      const salaryEmployeesResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE is_admin = false 
        AND is_active = true 
        AND employee_type = 'salary'
      `
      if (salaryEmployeesResult && salaryEmployeesResult.length > 0) {
        salaryEmployees = Number.parseInt(salaryEmployeesResult[0].count, 10) || 0
      }
      console.log(`Salary employees: ${salaryEmployees}`)
    } catch (e) {
      console.error("Error counting salary employees:", e)
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        nonAdminUsers,
        activeUsers,
        activeEmployees,
        hourlyEmployees,
        salaryEmployees,
      },
    })
  } catch (error) {
    console.error("Error fetching employee statistics:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee statistics: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

