// This is a simplified version of the db.ts file for debugging
import postgres from "postgres"

// Create a simple function to test the database connection
export async function testDbConnection() {
  try {
    // Create a new connection for testing
    const sql = postgres(process.env.DATABASE_URL || "", {
      ssl: process.env.NODE_ENV === "production",
      max: 1, // Use only one connection for this test
      idle_timeout: 10, // Short timeout
      connect_timeout: 10, // Short timeout
    })

    // Try a simple query
    const result = await sql`SELECT 1 as test`

    // Close the connection
    await sql.end()

    // Return the result
    return {
      success: true,
      result: result[0]?.test,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Export a simplified SQL client for testing
export const sql = postgres(process.env.DATABASE_URL || "", {
  ssl: process.env.NODE_ENV === "production",
})

