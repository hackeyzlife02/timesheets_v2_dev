export async function GET() {
  try {
    console.log("=== SIMPLE RESPONSE API CALLED ===")

    // Just return a simple response without any database access
    return new Response(
      JSON.stringify({
        success: true,
        message: "Simple response without database access",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in simple response API:", error)

    // Use Response instead of NextResponse
    return new Response(
      JSON.stringify({
        success: false,
        message: "Simple response failed: " + (error instanceof Error ? error.message : String(error)),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

