import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get database connection info
    const connectionTest = await sql`SELECT current_timestamp as server_time`

    // Get environment info
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      databaseUrl: process.env.DATABASE_URL ? "Set (masked)" : "Not set",
    }

    // Get request info
    const requestInfo = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    }

    // Return debug info
    return NextResponse.json({
      success: true,
      message: "Debug information",
      data: {
        serverTime: connectionTest.rows[0]?.server_time,
        environment,
        requestInfo,
      },
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error in debug endpoint",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

