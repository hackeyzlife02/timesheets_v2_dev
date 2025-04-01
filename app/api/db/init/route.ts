import { NextResponse } from "next/server"
import { createTables, seedUsers } from "@/lib/migrations"
import { sql } from "@/lib/db"

export async function GET() {
  const logs: string[] = []

  try {
    logs.push("Checking if database tables already exist...")

    // Check if tables already exist using a more robust method
    let tablesExist = false
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        );
      `

      tablesExist = result && result.rows && result.rows.length > 0 && result.rows[0].exists === true

      logs.push(tablesExist ? "Users table already exists" : "Users table does not exist")
    } catch (error) {
      logs.push(`Error checking if tables exist: ${error instanceof Error ? error.message : String(error)}`)
      // Continue with initialization if we can't check
    }

    if (tablesExist) {
      logs.push("Database tables already exist, checking for users...")

      // Check if users exist
      try {
        const userResult = await sql`SELECT COUNT(*) FROM users`

        // More defensive check
        let userCount = 0
        if (
          userResult &&
          userResult.rows &&
          Array.isArray(userResult.rows) &&
          userResult.rows.length > 0 &&
          userResult.rows[0] &&
          userResult.rows[0].count !== undefined
        ) {
          userCount = Number.parseInt(userResult.rows[0].count, 10)
        }

        logs.push(`Found ${userCount} existing users`)

        if (userCount > 0) {
          logs.push("Users already exist, no need to seed")
          return NextResponse.json({
            success: true,
            message: `Database tables already exist with ${userCount} users. No action needed.`,
            logs,
          })
        } else {
          logs.push("Tables exist but no users found, proceeding with user seeding")
        }
      } catch (error) {
        logs.push(`Error checking existing users: ${error instanceof Error ? error.message : String(error)}`)
        // If we can't check users, we'll try to seed anyway
      }
    } else {
      logs.push("Creating database tables...")

      // Create tables
      const tablesResult = await createTables()
      if (!tablesResult.success) {
        logs.push(`Failed to create tables: ${JSON.stringify(tablesResult.error)}`)
        console.error("Table creation error details:", tablesResult.error)
        return NextResponse.json(
          {
            success: false,
            message: "Failed to create tables",
            error: tablesResult.error,
            logs,
          },
          { status: 500 },
        )
      }

      logs.push("Database tables created successfully")
    }

    // Seed users
    logs.push("Seeding admin user...")
    const usersResult = await seedUsers()

    if (!usersResult.success) {
      // If the error is about duplicate key, it means the user already exists
      const errorMessage = usersResult.error?.message || String(usersResult.error)
      if (errorMessage.includes("duplicate key") && errorMessage.includes("users_username_key")) {
        logs.push("Admin user already exists (detected from error)")
        return NextResponse.json({
          success: true,
          message: "Database initialized successfully. Admin user already exists.",
          logs,
        })
      }

      logs.push(`Failed to seed users: ${JSON.stringify(usersResult.error)}`)
      console.error("User seeding error details:", usersResult.error)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to seed users",
          error: usersResult.error,
          logs,
        },
        { status: 500 },
      )
    }

    logs.push(`User seeding completed: ${usersResult.message}`)

    return NextResponse.json({
      success: true,
      message: usersResult.message || "Database initialized successfully",
      logs,
    })
  } catch (error) {
    logs.push(`Unexpected error during initialization: ${error instanceof Error ? error.message : String(error)}`)
    console.error("Error initializing database:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while initializing the database",
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : String(error),
        logs,
      },
      { status: 500 },
    )
  }
}

