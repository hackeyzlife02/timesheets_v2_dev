import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("=== SIMPLIFIED DIAGNOSE API CALLED ===")

    const results = {
      allUsers: null,
      sampleUsers: [],
      nonAdminUsers: null,
      activeUsers: null,
      activeNonAdminUsers: null,
    }

    // Get all users - simplest query
    try {
      const allUsers = await sql`SELECT COUNT(*) as count FROM users`
      results.allUsers = allUsers?.rows?.[0]?.count || null
      console.log("All users count:", results.allUsers)
    } catch (e) {
      console.error("Error counting users:", e)
      results.allUsers = `Error: ${e.message}`
    }

    // Get sample users - just a few columns
    try {
      const sampleUsers = await sql`
        SELECT id, username, is_admin::text, is_active::text
        FROM users 
        LIMIT 3
      `
      results.sampleUsers = sampleUsers?.rows || []
      console.log("Sample users:", JSON.stringify(results.sampleUsers))
    } catch (e) {
      console.error("Error fetching sample users:", e)
      results.sampleUsers = [`Error: ${e.message}`]
    }

    // Count non-admin users
    try {
      const nonAdminUsers = await sql`SELECT COUNT(*) as count FROM users WHERE is_admin = false`
      results.nonAdminUsers = nonAdminUsers?.rows?.[0]?.count || null
      console.log("Non-admin users count:", results.nonAdminUsers)
    } catch (e) {
      console.error("Error counting non-admin users:", e)
      results.nonAdminUsers = `Error: ${e.message}`
    }

    // Count active users
    try {
      const activeUsers = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`
      results.activeUsers = activeUsers?.rows?.[0]?.count || null
      console.log("Active users count:", results.activeUsers)
    } catch (e) {
      console.error("Error counting active users:", e)
      results.activeUsers = `Error: ${e.message}`
    }

    // Count active non-admin users
    try {
      const activeNonAdminUsers =
        await sql`SELECT COUNT(*) as count FROM users WHERE is_admin = false AND is_active = true`
      results.activeNonAdminUsers = activeNonAdminUsers?.rows?.[0]?.count || null
      console.log("Active non-admin users count:", results.activeNonAdminUsers)
    } catch (e) {
      console.error("Error counting active non-admin users:", e)
      results.activeNonAdminUsers = `Error: ${e.message}`
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("Error in simplified diagnose API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Diagnostic failed: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

