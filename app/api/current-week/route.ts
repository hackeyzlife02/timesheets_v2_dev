import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // This endpoint is no longer needed as we're calculating dates client-side
    // Keeping it for backward compatibility
    return NextResponse.json({
      success: true,
      message: "This endpoint is deprecated. Dates are now calculated client-side.",
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 })
  }
}

