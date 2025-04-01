import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createHtmlResponse } from "./html-response"

export async function GET(request: Request) {
  const logs: string[] = []
  const isDirectAccess = request.headers.get("accept")?.includes("text/html") || false

  try {
    logs.push("Starting migration process...")

    // First, check database connection
    try {
      const testConnection = await sql`SELECT 1 as test`
      logs.push("Database connection successful")
    } catch (dbError) {
      logs.push(`Database connection error: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      const responseData = {
        success: false,
        message: "Failed to connect to database",
        error: dbError instanceof Error ? dbError.message : String(dbError),
        logs,
      }

      return isDirectAccess
        ? new Response(createHtmlResponse(responseData), {
            status: 500,
            headers: { "Content-Type": "text/html" },
          })
        : NextResponse.json(responseData, { status: 500 })
    }

    // Check if admin_approved column exists in timesheets table
    logs.push("Checking if admin_approved column exists in timesheets table...")
    let columnExists = false

    try {
      const checkResult = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'timesheets'
          AND column_name = 'admin_approved'
        );
      `

      logs.push(`Column check result: ${JSON.stringify(checkResult)}`)

      if (checkResult && checkResult.rows && checkResult.rows.length > 0) {
        columnExists = checkResult.rows[0].exists === true
      }

      logs.push(`admin_approved column exists: ${columnExists}`)
    } catch (checkError) {
      logs.push(`Error checking column: ${checkError instanceof Error ? checkError.message : String(checkError)}`)
      const responseData = {
        success: false,
        message: "Failed to check if column exists",
        error: checkError instanceof Error ? checkError.message : String(checkError),
        logs,
      }

      return isDirectAccess
        ? new Response(createHtmlResponse(responseData), {
            status: 500,
            headers: { "Content-Type": "text/html" },
          })
        : NextResponse.json(responseData, { status: 500 })
    }

    if (!columnExists) {
      // Add admin_approved column to timesheets table
      logs.push("Adding admin_approved column to timesheets table...")
      try {
        await sql`
          ALTER TABLE timesheets 
          ADD COLUMN admin_approved BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN approval_date TIMESTAMP,
          ADD COLUMN approved_by INTEGER REFERENCES users(id);
        `
        logs.push("Columns added successfully")
      } catch (alterError) {
        logs.push(`Error adding columns: ${alterError instanceof Error ? alterError.message : String(alterError)}`)
        const responseData = {
          success: false,
          message: "Failed to add columns",
          error: alterError instanceof Error ? alterError.message : String(alterError),
          logs,
        }

        return isDirectAccess
          ? new Response(createHtmlResponse(responseData), {
              status: 500,
              headers: { "Content-Type": "text/html" },
            })
          : NextResponse.json(responseData, { status: 500 })
      }
    } else {
      logs.push("admin_approved column already exists")
    }

    logs.push("Migration completed successfully")
    const responseData = {
      success: true,
      message: "Migration completed successfully",
      logs,
    }

    return isDirectAccess
      ? new Response(createHtmlResponse(responseData), {
          headers: { "Content-Type": "text/html" },
        })
      : NextResponse.json(responseData)
  } catch (error) {
    logs.push(`Unhandled error during migration: ${error instanceof Error ? error.message : String(error)}`)
    console.error("Migration error:", error)

    const responseData = {
      success: false,
      message: "Migration failed due to an unhandled error",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      logs,
    }

    return isDirectAccess
      ? new Response(createHtmlResponse(responseData), {
          status: 500,
          headers: { "Content-Type": "text/html" },
        })
      : NextResponse.json(responseData, { status: 500 })
  }
}

