import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    console.log("Seeding database with test users...")

    // Check if we already have users
    const userCount = await sql`SELECT COUNT(*) as count FROM users`
    const count = userCount.rows[0]?.count || 0

    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already has ${count} users. No seeding needed.`,
        data: { userCount: count },
      })
    }

    // Create test users
    const password = await bcrypt.hash("password123", 10)

    // Create admin user
    await sql`
      INSERT INTO users (username, email, password_hash, is_admin, is_active, employment_type)
      VALUES ('admin', 'admin@example.com', ${password}, true, true, 'salary')
    `

    // Create regular employees
    const employees = [
      { username: "john", email: "john@example.com", type: "hourly" },
      { username: "jane", email: "jane@example.com", type: "salary" },
      { username: "bob", email: "bob@example.com", type: "hourly" },
      { username: "alice", email: "alice@example.com", type: "salary" },
      { username: "mike", email: "mike@example.com", type: "hourly" },
    ]

    for (const emp of employees) {
      await sql`
        INSERT INTO users (username, email, password_hash, is_admin, is_active, employment_type)
        VALUES (${emp.username}, ${emp.email}, ${password}, false, true, ${emp.type})
      `
    }

    // Get updated counts
    const updatedUserCount = await sql`SELECT COUNT(*) as count FROM users`
    const hourlyCount = await sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE employment_type = 'hourly' 
      AND is_admin = false
    `

    const salaryCount = await sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE employment_type = 'salary' 
      AND is_admin = false
    `

    return NextResponse.json({
      success: true,
      message: "Database seeded with test users",
      data: {
        totalUsers: updatedUserCount.rows[0]?.count || 0,
        hourlyEmployees: hourlyCount.rows[0]?.count || 0,
        salaryEmployees: salaryCount.rows[0]?.count || 0,
      },
    })
  } catch (error) {
    console.error("Error seeding database:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed database: " + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

