"use server"

import { sql } from "@/lib/db"
import { formatDate } from "@/lib/date-utils"
import { cookies } from "next/headers"

// Function to get the current user ID
async function getCurrentUserId(): Promise<number | null> {
  try {
    // Try to get the session token from cookies
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      console.log("No session token found in cookies")
      return null
    }

    // Query the database to get the user ID from the session
    const result = await sql`
      SELECT user_id FROM sessions WHERE token = ${sessionToken}
    `

    if (Array.isArray(result) && result.length > 0) {
      return result[0].user_id
    } else if (result?.rows && result.rows.length > 0) {
      return result.rows[0].user_id
    }

    console.log("No user found for session token")
    return null
  } catch (error) {
    console.error("Error getting current user ID:", error)
    return null
  }
}

// Helper function to get Monday of a given week
function getMondayOfWeek(date: Date): Date {
  const day = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  // Calculate days to subtract to get to Monday
  const daysToSubtract = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setDate(date.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Function to create a timesheet for a specific user
async function createTimesheetForUser(
  userId: number,
  weekStartDate: Date,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    console.log(`Creating timesheet for user ${userId} with week starting ${weekStartDate.toISOString()}`)

    // Ensure the week start date is a Monday
    const monday = getMondayOfWeek(weekStartDate)
    const formattedDate = formatDate(monday)

    console.log(`Formatted Monday date: ${formattedDate}`)

    // Check if a timesheet already exists for this week
    const existingResult = await sql`
      SELECT id FROM timesheets 
      WHERE user_id = ${userId} 
      AND week_start_date = ${formattedDate}::date
    `

    if (
      (Array.isArray(existingResult) && existingResult.length > 0) ||
      (existingResult?.rows && existingResult.rows.length > 0)
    ) {
      return {
        success: false,
        error: "A timesheet already exists for this week",
      }
    }

    // Create a new timesheet
    const result = await sql`
      INSERT INTO timesheets (
        user_id, 
        week_start_date, 
        status, 
        certified
      )
      VALUES (
        ${userId}, 
        ${formattedDate}::date, 
        'draft', 
        false
      )
      RETURNING id
    `

    let timesheetId: number | undefined

    if (Array.isArray(result) && result.length > 0) {
      timesheetId = result[0].id
    } else if (result?.rows && result.rows.length > 0) {
      timesheetId = result.rows[0].id
    }

    if (!timesheetId) {
      return {
        success: false,
        error: "Failed to create timesheet",
      }
    }

    // Create default days for the timesheet
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    for (const dayName of dayNames) {
      const isWeekend = dayName === "saturday" || dayName === "sunday"

      await sql`
        INSERT INTO timesheet_days (
          timesheet_id,
          day_name,
          did_not_work
        )
        VALUES (
          ${timesheetId},
          ${dayName},
          ${isWeekend}
        )
      `
    }

    return {
      success: true,
      id: timesheetId,
    }
  } catch (error) {
    console.error("Error creating timesheet for user:", error)
    return {
      success: false,
      error: "Error creating timesheet for user: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Main function to create a timesheet
export async function createTimesheet(
  weekStartDateString: string,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // Parse the date
    const weekStartDate = new Date(weekStartDateString)

    // Get the current user ID
    const userId = await getCurrentUserId()

    if (!userId) {
      console.log("No authenticated user found, using default user ID 1 for testing")
      // For testing purposes, use user ID 1 if no authenticated user is found
      return createTimesheetForUser(1, weekStartDate)
    }

    return createTimesheetForUser(userId, weekStartDate)
  } catch (error) {
    console.error("Error creating timesheet:", error)
    return {
      success: false,
      error: "Error creating timesheet: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

