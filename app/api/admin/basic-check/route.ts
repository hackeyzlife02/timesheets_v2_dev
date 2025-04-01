import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("=== BASIC CHECK API CALLED ===")

    // Test 1: Simple SELECT 1
    let test1Result = null
    try {
      const result = await sql`SELECT 1 as test`
      test1Result = result?.rows?.[0]?.test || null
      console.log("Test 1 (SELECT 1):", test1Result)
    } catch (e) {
      console.error("Error in Test 1:", e)
      test1Result = `Error: ${e.message}`
    }

    // Test 2: Check database connection
    let test2Result = null
    try {
      const result = await sql`SELECT current_database() as db`
      test2Result = result?.rows?.[0]?.db || null
      console.log("Test 2 (current_database):", test2Result)
    } catch (e) {
      console.error("Error in Test 2:", e)
      test2Result = `Error: ${e.message}`
    }

    // Test 3: Try to access users table
    let test3Result = null
    try {
      const result = await sql`SELECT EXISTS (SELECT 1 FROM users LIMIT 1) as exists`
      test3Result = result?.rows?.[0]?.exists || null
      console.log("Test 3 (users table exists):", test3Result)
    } catch (e) {
      console.error("Error in Test 3:", e)
      test3Result = `Error: ${e.message}`
    }

    // Test 4: Try to count users
    let test4Result = null
    try {
      const result = await sql`SELECT COUNT(*) as count FROM users`
      test4Result = result?.rows?.[0]?.count || null
      console.log("Test 4 (count users):", test4Result)
    } catch (e) {
      console.error("Error in Test 4:", e)
      test4Result = `Error: ${e.message}`
    }

    // Test 5: Try to get one user
    let test5Result = null
    try {
      const result = await sql`SELECT id, username FROM users LIMIT 1`
      test5Result = result?.rows?.[0] ? JSON.stringify(result.rows[0]) : null
      console.log("Test 5 (one user):", test5Result)
    } catch (e) {
      console.error("Error in Test 5:", e)
      test5Result = `Error: ${e.message}`
    }

    // Test 6: Check if the database check API is using a different connection
    let test6Result = null
    try {
      // This is the query from your database check API
      const result = await sql`SELECT COUNT(*) FROM users`
      test6Result = result?.rows?.[0]?.count || null
      console.log("Test 6 (db check query):", test6Result)
    } catch (e) {
      console.error("Error in Test 6:", e)
      test6Result = `Error: ${e.message}`
    }

    return NextResponse.json({
      success: true,
      data: {
        test1: test1Result,
        test2: test2Result,
        test3: test3Result,
        test4: test4Result,
        test5: test5Result,
        test6: test6Result,
      },
    })
  } catch (error) {
    console.error("Error in basic check API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Basic check failed: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

