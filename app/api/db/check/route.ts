import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("Checking database status...")
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

    // First, try a very simple query to check connection
    try {
      const testResult = await sql`SELECT 1 as test`
      console.log("Basic connection test result:", JSON.stringify(testResult))
    } catch (e) {
      console.error("Error with basic connection test:", e)
      return NextResponse.json({
        initialized: false,
        message: "Database connection failed",
        error: e instanceof Error ? e.message : String(e),
      })
    }

    // Get all tables in the database
    let allTablesResult
    try {
      allTablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      console.log("All tables query result:", JSON.stringify(allTablesResult))
    } catch (e) {
      console.error("Error getting tables:", e)
      return NextResponse.json({
        initialized: false,
        message: "Error getting database tables",
        error: e instanceof Error ? e.message : String(e),
      })
    }

    // Check if all required tables exist
    const requiredTables = ["users", "timesheets", "timesheet_days"]
    let existingTables = []

    if (!allTablesResult) {
      console.log("All tables result is undefined")
      return NextResponse.json({
        initialized: false,
        message: "Could not retrieve database tables",
      })
    }

    if (Array.isArray(allTablesResult)) {
      console.log("All tables result is an array")
      existingTables = allTablesResult.map((row) => row.table_name)
    } else if (allTablesResult.rows && Array.isArray(allTablesResult.rows)) {
      console.log("All tables result has rows array")
      existingTables = allTablesResult.rows.map((row) => row.table_name)
    } else {
      console.log("All tables result has unexpected structure:", typeof allTablesResult)
      console.log("All tables result keys:", Object.keys(allTablesResult))

      // Try to extract table names in a different way
      if (typeof allTablesResult === "object" && allTablesResult !== null) {
        const keys = Object.keys(allTablesResult)
        if (keys.includes("rows") && Array.isArray(allTablesResult.rows)) {
          existingTables = allTablesResult.rows.map((row) => row.table_name)
        }
      }
    }

    console.log("Existing tables:", existingTables)

    // Check if all required tables exist
    const allTablesExist = requiredTables.every((table) => existingTables.includes(table))

    if (!allTablesExist) {
      console.log("Not all required tables exist")
      return NextResponse.json({
        initialized: false,
        existingTables,
        message: "Not all required database tables exist.",
      })
    }

    // Check if users exist
    let userResult
    try {
      userResult = await sql`SELECT COUNT(*) FROM users`
      console.log("User count result:", JSON.stringify(userResult))
    } catch (error) {
      console.error("Error checking users:", error)
      return NextResponse.json({
        initialized: false,
        message: "Error checking users table",
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Extract user count from result
    let userCount = 0
    if (Array.isArray(userResult) && userResult.length > 0) {
      userCount = Number.parseInt(userResult[0].count, 10)
    } else if (userResult?.rows && userResult.rows.length > 0) {
      userCount = Number.parseInt(userResult.rows[0].count, 10)
    } else {
      console.log("User count result has unexpected structure:", typeof userResult)
      console.log("User count result:", JSON.stringify(userResult))
    }

    console.log("User count:", userCount)

    // Check specifically for ghotarek user
    let adminResult
    try {
      adminResult = await sql`
        SELECT COUNT(*) FROM users WHERE username = 'ghotarek'
      `
      console.log("Admin check result:", JSON.stringify(adminResult))
    } catch (error) {
      console.error("Error checking admin user:", error)
    }

    // Extract admin exists from result
    let adminExists = false
    if (Array.isArray(adminResult) && adminResult.length > 0) {
      adminExists = Number.parseInt(adminResult[0].count, 10) > 0
    } else if (adminResult?.rows && adminResult.rows.length > 0) {
      adminExists = Number.parseInt(adminResult.rows[0].count, 10) > 0
    } else {
      console.log("Admin check result has unexpected structure:", typeof adminResult)
      console.log("Admin check result:", JSON.stringify(adminResult))
    }

    console.log("Admin exists:", adminExists)

    const initialized = userCount > 0

    return NextResponse.json({
      initialized,
      adminExists,
      userCount,
      allTablesExist,
      existingTables,
      message: initialized
        ? `Database is initialized with ${userCount} users${adminExists ? " including admin user" : ""}.`
        : "Database tables exist but no users found.",
    })
  } catch (error) {
    console.error("Error checking database status:", error)

    return NextResponse.json(
      {
        initialized: false,
        message: "Error checking database status",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

