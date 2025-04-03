import { sql } from "./db"
import {
  calculateDayHours,
  calculateWeeklyTotals,
  validateBreakTimes,
  calculateBreakDuration,
  shouldDeductBreak,
} from "./timesheet-calculation-service"

// Re-export all calculation functions that might be imported from this module
export { calculateBreakDuration, shouldDeductBreak, calculateDayHours, calculateWeeklyTotals, validateBreakTimes }

// Types for timesheet data
export interface DayEntry {
  didNotWork: boolean
  timeIn: string
  mealBreakStart: string
  mealBreakEnd: string
  timeOut: string
  amBreakStart: string
  amBreakEnd: string
  pmBreakStart: string
  pmBreakEnd: string
  outOfTownHours: number
  outOfTownMinutes: number
  reasons: string
  totalRegularHours: number
  totalOvertimeHours: number
  totalDoubleTimeHours: number
  isSeventhConsecutiveDay: boolean
}

export interface Timesheet {
  id?: number
  userId: number
  weekStartDate: string
  status: "draft" | "submitted" | "certified" | "rejected"
  certified: boolean
  submissionDate?: string
  days: {
    [key: string]: DayEntry
  }
  totalRegularHours: number
  totalOvertimeHours: number
  totalDoubleTimeHours: number
}

// Add this function to check for existing timesheets in the same week
export async function checkExistingTimesheet(userId: number, weekStartDate: Date): Promise<boolean> {
  try {
    console.log(`Checking for existing timesheet for user ${userId} in week of ${weekStartDate.toISOString()}`)

    // Create date range for the week
    const weekStart = new Date(weekStartDate)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    weekEnd.setHours(0, 0, 0, 0)

    console.log(`Week range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)

    // Query for existing timesheets in this week
    const result = await sql`
      SELECT id 
      FROM timesheets 
      WHERE user_id = ${userId} 
      AND week_start_date >= ${weekStart} 
      AND week_start_date < ${weekEnd}
    `

    // Check if any timesheets were found
    let exists = false

    if (Array.isArray(result) && result.length > 0) {
      exists = true
    } else if (result?.rows && result.rows.length > 0) {
      exists = true
    }

    console.log(`Existing timesheet found: ${exists}`)
    return exists
  } catch (error) {
    console.error("Error checking for existing timesheet:", error)
    // In case of error, return false to allow creation (better UX than blocking)
    return false
  }
}

// Update the saveTimesheet function to check for duplicates
export async function saveTimesheet(
  timesheetData: Timesheet,
): Promise<{ success: boolean; message?: string; id?: number; duplicate?: boolean }> {
  try {
    console.log("Starting saveTimesheet function with data:", JSON.stringify(timesheetData, null, 2))

    // If this is a new timesheet (no ID), check for duplicates
    if (!timesheetData.id) {
      const weekStartDate = new Date(timesheetData.weekStartDate)
      console.log("Week start date from submission:", weekStartDate.toISOString())

      // Ensure the week start date is a Monday
      const dayOfWeek = weekStartDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (dayOfWeek !== 1) {
        console.warn("Week start date is not a Monday! Adjusting...")
        // If it's Sunday (0), add 1 day to get to Monday
        // For any other day, subtract days to get to the previous Monday
        const daysToAdjust = dayOfWeek === 0 ? 1 : dayOfWeek - 1
        weekStartDate.setDate(weekStartDate.getDate() + (dayOfWeek === 0 ? 1 : -(dayOfWeek - 1)))
        console.log("Adjusted week start date to Monday:", weekStartDate.toISOString())

        // Update the timesheet data with the corrected date
        timesheetData.weekStartDate = weekStartDate.toISOString().split("T")[0]
        console.log("Updated timesheet data with corrected date:", timesheetData.weekStartDate)
      }

      const exists = await checkExistingTimesheet(timesheetData.userId, weekStartDate)

      if (exists) {
        return {
          success: false,
          message: "A timesheet already exists for this week. You can only have one timesheet per week.",
          duplicate: true,
        }
      }
    }

    // Calculate weekly totals using the centralized calculation service
    const totals = calculateWeeklyTotals(timesheetData)
    let timesheetId = timesheetData.id

    // Execute each query individually without using transactions
    // This is a workaround for the transaction issue

    if (timesheetId) {
      // Update existing timesheet
      console.log(`Updating existing timesheet with ID: ${timesheetId}`)
      await sql`
        UPDATE timesheets
        SET 
          status = ${timesheetData.status},
          certified = ${timesheetData.certified},
          submission_date = ${timesheetData.certified ? new Date() : null},
          total_regular_hours = ${totals.regular},
          total_overtime_hours = ${totals.overtime},
          total_double_time_hours = ${totals.doubleTime},
          updated_at = NOW()
        WHERE id = ${timesheetId}
      `
    } else {
      // Insert new timesheet
      console.log("Inserting new timesheet with start date:", timesheetData.weekStartDate)
      const insertResult = await sql`
        INSERT INTO timesheets (
          user_id, 
          week_start_date, 
          status, 
          certified, 
          submission_date,
          total_regular_hours,
          total_overtime_hours,
          total_double_time_hours
        )
        VALUES (
          ${timesheetData.userId}, 
          ${new Date(timesheetData.weekStartDate)}, 
          ${timesheetData.status}, 
          ${timesheetData.certified}, 
          ${timesheetData.certified ? new Date() : null},
          ${totals.regular},
          ${totals.overtime},
          ${totals.doubleTime}
        )
        RETURNING id
      `

      console.log("Insert result:", insertResult)

      if (Array.isArray(insertResult) && insertResult.length > 0) {
        timesheetId = insertResult[0].id
      } else if (insertResult?.rows && insertResult.rows.length > 0) {
        timesheetId = insertResult.rows[0].id
      } else {
        console.error("Failed to get inserted timesheet ID:", insertResult)
        throw new Error("Failed to get inserted timesheet ID")
      }

      console.log(`New timesheet inserted with ID: ${timesheetId}`)
    }

    // If updating, delete existing days to replace them
    if (timesheetData.id) {
      console.log(`Deleting existing days for timesheet ID: ${timesheetId}`)
      await sql`DELETE FROM timesheet_days WHERE timesheet_id = ${timesheetId}`
    }

    // Insert days
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    console.log(`Inserting days for timesheet ID: ${timesheetId}`)

    for (const dayName of dayOrder) {
      const day = timesheetData.days[dayName]
      if (!day) {
        console.log(`No data for ${dayName}, skipping`)
        continue
      }

      console.log(`Inserting data for ${dayName}`)
      await sql`
        INSERT INTO timesheet_days (
          timesheet_id,
          day_name,
          did_not_work,
          time_in,
          time_out,
          meal_break_start,
          meal_break_end,
          am_break_start,
          am_break_end,
          pm_break_start,
          pm_break_end,
          out_of_town_hours,
          out_of_town_minutes,
          reasons,
          total_regular_hours,
          total_overtime_hours,
          total_double_time_hours,
          is_seventh_consecutive_day
        )
        VALUES (
          ${timesheetId},
          ${dayName},
          ${day.didNotWork},
          ${day.timeIn || null},
          ${day.timeOut || null},
          ${day.mealBreakStart || null},
          ${day.mealBreakEnd || null},
          ${day.amBreakStart || null},
          ${day.amBreakEnd || null},
          ${day.pmBreakStart || null},
          ${day.pmBreakEnd || null},
          ${day.outOfTownHours || 0},
          ${day.outOfTownMinutes || 0},
          ${day.reasons || null},
          ${day.totalRegularHours || 0},
          ${day.totalOvertimeHours || 0},
          ${day.totalDoubleTimeHours || 0},
          ${day.isSeventhConsecutiveDay || false}
        )
      `
    }

    console.log("All operations completed successfully")
    return {
      success: true,
      message: timesheetData.certified ? "Timesheet certified successfully!" : "Timesheet saved as draft.",
      id: timesheetId,
    }
  } catch (error) {
    console.error("Error saving timesheet:", error)
    return {
      success: false,
      message:
        "An error occurred while saving the timesheet: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Function to get timesheets for a user
export async function getTimesheets(userId: number): Promise<any[]> {
  try {
    console.log(`Fetching timesheets for user ID: ${userId}`)
    const result = await sql`
      SELECT 
        id, 
        user_id as "userId", 
        week_start_date as "weekStartDate", 
        status, 
        certified, 
        submission_date as "submissionDate",
        total_regular_hours as "totalRegularHours",
        total_overtime_hours as "totalOvertimeHours",
        total_double_time_hours as "totalDoubleTimeHours",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM timesheets 
      WHERE user_id = ${userId}
      ORDER BY week_start_date DESC
    `

    console.log("Timesheets query result:", result)

    // Handle different response formats
    if (Array.isArray(result)) {
      return result
    } else if (result?.rows && Array.isArray(result.rows)) {
      return result.rows
    } else {
      console.error("Unexpected result format:", result)
      return []
    }
  } catch (error) {
    console.error("Error fetching timesheets:", error)
    return []
  }
}

// Function to get a timesheet by ID
export async function getTimesheetById(id: number): Promise<any> {
  try {
    console.log(`Fetching timesheet with ID: ${id}`)
    // Get timesheet
    const timesheetResult = await sql`
      SELECT 
        id, 
        user_id as "userId", 
        week_start_date as "weekStartDate", 
        status, 
        certified, 
        submission_date as "submissionDate",
        total_regular_hours as "totalRegularHours",
        total_overtime_hours as "totalOvertimeHours",
        total_double_time_hours as "totalDoubleTimeHours",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM timesheets 
      WHERE id = ${id}
    `

    console.log("Timesheet query result:", timesheetResult)

    let timesheet = null

    if (Array.isArray(timesheetResult) && timesheetResult.length > 0) {
      timesheet = timesheetResult[0]
    } else if (timesheetResult?.rows && timesheetResult.rows.length > 0) {
      timesheet = timesheetResult.rows[0]
    }

    if (!timesheet) {
      console.log(`No timesheet found with ID: ${id}`)
      return null
    }

    // Get timesheet days
    const daysResult = await sql`
      SELECT 
        id,
        day_name as "dayName",
        did_not_work as "didNotWork",
        time_in as "timeIn",
        time_out as "timeOut",
        meal_break_start as "mealBreakStart",
        meal_break_end as "mealBreakEnd",
        am_break_start as "amBreakStart",
        amBreak_end as "amBreakEnd",
        pm_break_start as "pmBreakStart",
        pm_break_end as "pmBreakEnd",
        out_of_town_hours as "outOfTownHours",
        out_of_town_minutes as "outOfTownMinutes",
        reasons,
        total_regular_hours as "totalRegularHours",
        total_overtime_hours as "totalOvertimeHours",
        total_double_time_hours as "totalDoubleTimeHours",
        is_seventh_consecutive_day as "isSeventhConsecutiveDay"
      FROM timesheet_days
      WHERE timesheet_id = ${id}
    `

    console.log("Timesheet days query result:", daysResult)

    // Convert days array to object with day names as keys
    const days: { [key: string]: DayEntry } = {}

    const daysArray = Array.isArray(daysResult)
      ? daysResult
      : daysResult?.rows && Array.isArray(daysResult.rows)
        ? daysResult.rows
        : []

    for (const day of daysArray) {
      days[day.dayName] = {
        didNotWork: day.didNotWork,
        timeIn: day.timeIn || "",
        timeOut: day.timeOut || "",
        mealBreakStart: day.mealBreakStart || "",
        mealBreakEnd: day.mealBreakEnd || "",
        amBreakStart: day.amBreakStart || "",
        amBreakEnd: day.amBreakEnd || "",
        pmBreakStart: day.pmBreakStart || "",
        pmBreakEnd: day.pmBreakEnd || "",
        outOfTownHours: day.outOfTownHours || 0,
        outOfTownMinutes: day.outOfTownMinutes || 0,
        reasons: day.reasons || "",
        totalRegularHours: day.totalRegularHours || 0,
        totalOvertimeHours: day.totalOvertimeHours || 0,
        totalDoubleTimeHours: day.totalDoubleTimeHours || 0,
        isSeventhConsecutiveDay: day.isSeventhConsecutiveDay || false,
      }
    }

    return {
      ...timesheet,
      days,
    }
  } catch (error) {
    console.error("Error fetching timesheet:", error)
    return null
  }
}

// Function to delete a timesheet
export async function deleteTimesheet(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    console.log(`Deleting timesheet with ID: ${id}`)
    await sql`DELETE FROM timesheets WHERE id = ${id}`
    return { success: true, message: "Timesheet deleted successfully" }
  } catch (error) {
    console.error("Error deleting timesheet:", error)
    return {
      success: false,
      message:
        "An error occurred while deleting the timesheet: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Function to get active timesheet for a user (current week)
export async function getActiveTimesheet(userId: number): Promise<any> {
  try {
    console.log(`Fetching active timesheet for user ID: ${userId}`)
    // Get the start of the current week (Monday)
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    // Calculate days to subtract to get to Monday
    const daysToSubtract = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    monday.setHours(0, 0, 0, 0)

    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)

    console.log(`Looking for timesheets between ${monday.toISOString()} and ${nextMonday.toISOString()}`)

    // Find active timesheet (draft for current week)
    const result = await sql`
      SELECT 
        id, 
        user_id as "userId", 
        week_start_date as "weekStartDate", 
        status, 
        certified, 
        submission_date as "submissionDate",
        total_regular_hours as "totalRegularHours",
        total_overtime_hours as "totalOvertimeHours",
        total_double_time_hours as "totalDoubleTimeHours"
      FROM timesheets 
      WHERE 
        user_id = ${userId} AND 
        status = 'draft' AND
        week_start_date >= ${monday} AND 
        week_start_date < ${nextMonday}
    `

    console.log("Active timesheet query result:", result)

    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    } else if (result?.rows && result.rows.length > 0) {
      return result.rows[0]
    } else {
      console.log("No active timesheet found")
      return null
    }
  } catch (error) {
    console.error("Error fetching active timesheet:", error)
    return null
  }
}

