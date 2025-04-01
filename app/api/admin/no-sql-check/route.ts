import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== NO SQL CHECK API CALLED ===")

    // Get environment variables (redact sensitive info)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split("://")[0]}://*****` : "Not defined",
      // Add other relevant env vars but redact sensitive parts
    }

    console.log("Environment:", envVars)

    // Check if we can import the sql client without using it
    let sqlImportStatus = "Not attempted"
    try {
      const { sql } = await import("@/lib/db")
      sqlImportStatus = "Imported successfully"
      console.log("SQL client import:", sqlImportStatus)
    } catch (e) {
      sqlImportStatus = `Error: ${e.message}`
      console.error("SQL client import error:", e)
    }

    // Return basic information
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envVars,
      sqlImportStatus,
      message: "This endpoint doesn't use SQL queries",
    })
  } catch (error) {
    console.error("Error in no-sql check API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "No-SQL check failed: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

