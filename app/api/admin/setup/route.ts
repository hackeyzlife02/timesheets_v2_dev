import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("Setting up database...")

    // Check if employment_type column exists in users table
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'employment_type'
    `

    if (columnCheck.rows.length === 0) {
      // Add employment_type column to users table
      await sql`
        ALTER TABLE users 
        ADD COLUMN employment_type VARCHAR(20) DEFAULT 'hourly'
      `
      console.log("Added employment_type column to users table")
    } else {
      console.log("employment_type column already exists in users table")
    }

    // Update some users to be salary employees for testing
    await sql`
      UPDATE users 
      SET employment_type = 'salary' 
      WHERE id % 2 = 0 
      AND is_admin = false
    `
    console.log("Updated some users to be salary employees")

    // Get counts
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
      message: "Database setup completed",
      data: {
        hourlyEmployees: hourlyCount.rows[0]?.count || 0,
        salaryEmployees: salaryCount.rows[0]?.count || 0,
      },
    })
  } catch (error) {
    console.error("Error setting up database:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to set up database: " + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

