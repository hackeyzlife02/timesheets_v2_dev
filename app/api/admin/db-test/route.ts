import { NextResponse } from "next/server"
import { testDbConnection } from "@/lib/db-debug"

export async function GET() {
  try {
    console.log("=== DB TEST API CALLED ===")

    // Test the database connection
    const testResult = await testDbConnection()
    console.log("DB connection test result:", testResult)

    return NextResponse.json({
      success: true,
      testResult,
    })
  } catch (error) {
    console.error("Error in db-test API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "DB test failed: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

