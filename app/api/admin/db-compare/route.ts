import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("=== DB COMPARE API CALLED ===")

    // Create a new SQL client instance
    const newSql = neon(process.env.DATABASE_URL!)

    // Test both SQL clients
    const results = {
      originalClient: {
        success: false,
        userCount: 0,
        error: null,
      },
      newClient: {
        success: false,
        userCount: 0,
        error: null,
      },
    }

    // Test the original SQL client
    try {
      const originalResult = await sql`SELECT COUNT(*) as count FROM users`
      results.originalClient.success = true
      results.originalClient.userCount = originalResult?.rows?.[0]?.count || 0
      console.log("Original SQL client - User count:", results.originalClient.userCount)
    } catch (e) {
      results.originalClient.error = e instanceof Error ? e.message : String(e)
      console.error("Error with original SQL client:", e)
    }

    // Test the new SQL client
    try {
      const newResult = await newSql`SELECT COUNT(*) as count FROM users`
      results.newClient.success = true
      results.newClient.userCount = newResult?.rows?.[0]?.count || 0
      console.log("New SQL client - User count:", results.newClient.userCount)
    } catch (e) {
      results.newClient.error = e instanceof Error ? e.message : String(e)
      console.error("Error with new SQL client:", e)
    }

    // Return the results
    return NextResponse.json({
      success: true,
      results,
      databaseUrl: process.env.DATABASE_URL ? "Exists (masked)" : "Missing",
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error("Error comparing database clients:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to compare database clients: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

