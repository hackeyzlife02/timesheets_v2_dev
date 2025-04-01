import { sql } from "./db"

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

// Helper function to calculate hours between two time strings
export function calculateHoursBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const start = startHours * 60 + startMinutes
  const end = endHours * 60 + endMinutes

  // If end time is earlier than start time, assume it's the next day
  const minutesDiff = end < start ? 24 * 60 - start + end : end - start

  return Number.parseFloat((minutesDiff / 60).toFixed(2))
}

// Calculate break duration in hours
export function calculateBreakDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  return calculateHoursBetween(startTime, endTime)
}

// Calculate total hours for a day, accounting for meal break and rest breaks
export function calculateDayHours(
  dayData: DayEntry,
  consecutiveWorkDays = 0,
): {
  regular: number
  overtime: number
  doubleTime: number
  totalWorked: number
} {
  if (dayData.didNotWork || !dayData.timeIn || !dayData.timeOut) {
    return { regular: 0, overtime: 0, doubleTime: 0, totalWorked: 0 }
  }

  // Calculate total hours from clock-in to clock-out
  let totalHours = calculateHoursBetween(dayData.timeIn, dayData.timeOut)

  // Subtract meal break if both start and end times are provided
  if (dayData.mealBreakStart && dayData.mealBreakEnd) {
    const mealBreakHours = calculateHoursBetween(dayData.mealBreakStart, dayData.mealBreakEnd)
    totalHours -= mealBreakHours
  }

  // Handle AM break: only subtract if it's more than 10 minutes
  if (dayData.amBreakStart && dayData.amBreakEnd) {
    const amBreakHours = calculateHoursBetween(dayData.amBreakStart, dayData.amBreakEnd)
    const amBreakMinutes = amBreakHours * 60

    // If break is more than 10 minutes, subtract the entire break duration
    if (amBreakMinutes > 10) {
      totalHours -= amBreakHours
      console.log(
        `AM break exceeds 10 minutes (${amBreakMinutes.toFixed(1)} min). Subtracting ${amBreakHours.toFixed(2)} hours.`,
      )
    } else {
      console.log(`AM break is within 10 minutes (${amBreakMinutes.toFixed(1)} min). Not subtracting from total hours.`)
    }
  }

  // Handle PM break: only subtract if it's more than 10 minutes
  if (dayData.pmBreakStart && dayData.pmBreakEnd) {
    const pmBreakHours = calculateHoursBetween(dayData.pmBreakStart, dayData.pmBreakEnd)
    const pmBreakMinutes = pmBreakHours * 60

    // If break is more than 10 minutes, subtract the entire break duration
    if (pmBreakMinutes > 10) {
      totalHours -= pmBreakHours
      console.log(
        `PM break exceeds 10 minutes (${pmBreakMinutes.toFixed(1)} min). Subtracting ${pmBreakHours.toFixed(2)} hours.`,
      )
    } else {
      console.log(`PM break is within 10 minutes (${pmBreakMinutes.toFixed(1)} min). Not subtracting from total hours.`)
    }
  }

  // Add out of town hours if provided
  const outOfTownHours = (dayData.outOfTownHours || 0) + (dayData.outOfTownMinutes || 0) / 60

  // Round to 2 decimal places and ensure non-negative
  totalHours = Math.max(0, Number.parseFloat(totalHours.toFixed(2)))

  // Apply California overtime rules
  let regularHours = 0
  let overtimeHours = 0
  let doubleTimeHours = 0

  // Check if it's a weekend day (Saturday or Sunday)
  const dayName = Object.keys(dayData)[0]?.toLowerCase() || ""
  const isWeekend = dayName === "saturday" || dayName === "sunday"

  // Check if it's the 7th consecutive workday
  if (dayData.isSeventhConsecutiveDay || consecutiveWorkDays >= 6) {
    // 7th consecutive day: First 8 hours at 1.5x, beyond 8 hours at 2x
    if (totalHours <= 8) {
      overtimeHours = totalHours
    } else {
      overtimeHours = 8
      doubleTimeHours = totalHours - 8
    }
  } else if (isWeekend) {
    // Weekend: All hours are overtime
    overtimeHours = totalHours
  } else {
    // Regular day: First 8 hours regular, 8-12 hours at 1.5x, beyond 12 hours at 2x
    if (totalHours <= 8) {
      regularHours = totalHours
    } else if (totalHours <= 12) {
      regularHours = 8
      overtimeHours = totalHours - 8
    } else {
      regularHours = 8
      overtimeHours = 4 // 12 - 8 = 4 hours of overtime
      doubleTimeHours = totalHours - 12
    }
  }

  return {
    regular: Number.parseFloat(regularHours.toFixed(2)),
    overtime: Number.parseFloat(overtimeHours.toFixed(2)),
    doubleTime: Number.parseFloat(doubleTimeHours.toFixed(2)),
    totalWorked: totalHours,
  }
}

// Calculate weekly totals
export function calculateWeeklyTotals(timesheet: Timesheet): {
  regular: number
  overtime: number
  doubleTime: number
  total: number
} {
  let totalRegular = 0
  let totalOvertime = 0
  let totalDoubleTime = 0

  // Track consecutive work days
  let consecutiveWorkDays = 0
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  // First pass: count consecutive work days
  for (const dayName of dayOrder) {
    const day = timesheet.days[dayName]
    if (day && !day.didNotWork && day.timeIn && day.timeOut) {
      consecutiveWorkDays++
    } else {
      consecutiveWorkDays = 0
    }

    // Mark 7th consecutive day
    if (consecutiveWorkDays >= 7) {
      timesheet.days[dayName].isSeventhConsecutiveDay = true
    }
  }

  // Second pass: calculate hours with consecutive day information
  consecutiveWorkDays = 0
  for (const dayName of dayOrder) {
    const day = timesheet.days[dayName]
    if (day && !day.didNotWork && day.timeIn && day.timeOut) {
      consecutiveWorkDays++
      const { regular, overtime, doubleTime } = calculateDayHours(day, consecutiveWorkDays - 1)
      totalRegular += regular
      totalOvertime += overtime
      totalDoubleTime += doubleTime
    } else {
      consecutiveWorkDays = 0
    }
  }

  return {
    regular: Number.parseFloat(totalRegular.toFixed(2)),
    overtime: Number.parseFloat(totalOvertime.toFixed(2)),
    doubleTime: Number.parseFloat(totalDoubleTime.toFixed(2)),
    total: Number.parseFloat((totalRegular + totalOvertime + totalDoubleTime).toFixed(2)),
  }
}

// Validate break times
export function validateBreakTimes(dayData: DayEntry): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (dayData.didNotWork) {
    return { valid: true, errors: [] }
  }

  // Convert times to minutes for easier comparison
  const timeInMinutes = dayData.timeIn ? timeToMinutes(dayData.timeIn) : null
  const timeOutMinutes = dayData.timeOut ? timeToMinutes(dayData.timeOut) : null
  const mealStartMinutes = dayData.mealBreakStart ? timeToMinutes(dayData.mealBreakStart) : null
  const mealEndMinutes = dayData.mealBreakEnd ? timeToMinutes(dayData.mealBreakEnd) : null
  const amStartMinutes = dayData.amBreakStart ? timeToMinutes(dayData.amBreakStart) : null
  const amEndMinutes = dayData.amBreakEnd ? timeToMinutes(dayData.amBreakEnd) : null
  const pmStartMinutes = dayData.pmBreakStart ? timeToMinutes(dayData.pmBreakStart) : null
  const pmEndMinutes = dayData.pmBreakEnd ? timeToMinutes(dayData.pmBreakEnd) : null

  // Check if time in and time out are provided
  if (!timeInMinutes && !timeOutMinutes) {
    return { valid: true, errors: [] } // No times entered yet
  }

  if (timeInMinutes && !timeOutMinutes) {
    errors.push("Time out is required if time in is provided")
  }

  if (!timeInMinutes && timeOutMinutes) {
    errors.push("Time in is required if time out is provided")
  }

  // Check if time in is before time out
  if (timeInMinutes && timeOutMinutes && timeInMinutes >= timeOutMinutes) {
    errors.push("Time in must be before time out")
  }

  // Validate meal break
  if ((mealStartMinutes && !mealEndMinutes) || (!mealStartMinutes && mealEndMinutes)) {
    errors.push("Both meal break start and end times must be provided")
  }

  if (mealStartMinutes && mealEndMinutes) {
    if (mealStartMinutes >= mealEndMinutes) {
      errors.push("Meal break start must be before meal break end")
    }

    if (timeInMinutes && mealStartMinutes < timeInMinutes) {
      errors.push("Meal break start must be after time in")
    }

    if (timeOutMinutes && mealEndMinutes > timeOutMinutes) {
      errors.push("Meal break end must be before time out")
    }
  }

  // Validate AM break
  if ((amStartMinutes && !amEndMinutes) || (!amStartMinutes && amEndMinutes)) {
    errors.push("Both AM break start and end times must be provided")
  }

  if (amStartMinutes && amEndMinutes) {
    if (amStartMinutes >= amEndMinutes) {
      errors.push("AM break start must be before AM break end")
    }

    if (timeInMinutes && amStartMinutes < timeInMinutes) {
      errors.push("AM break start must be after time in")
    }

    if (mealStartMinutes && amEndMinutes > mealStartMinutes) {
      errors.push("AM break must end before meal break starts")
    }

    if (timeOutMinutes && amEndMinutes > timeOutMinutes) {
      errors.push("AM break end must be before time out")
    }

    // Check if AM break is longer than 10 minutes
    const amBreakDuration = amEndMinutes - amStartMinutes
    if (amBreakDuration > 10) {
      // This is not an error, just a warning that could be displayed to the user
      // errors.push("AM break exceeds 10 minutes and will be deducted from your total hours")
    }
  }

  // Validate PM break
  if ((pmStartMinutes && !pmEndMinutes) || (!pmStartMinutes && pmEndMinutes)) {
    errors.push("Both PM break start and end times must be provided")
  }

  if (pmStartMinutes && pmEndMinutes) {
    if (pmStartMinutes >= pmEndMinutes) {
      errors.push("PM break start must be before PM break end")
    }

    if (mealEndMinutes && pmStartMinutes < mealEndMinutes) {
      errors.push("PM break must start after meal break ends")
    }

    if (timeInMinutes && pmStartMinutes < timeInMinutes) {
      errors.push("PM break start must be after time in")
    }

    if (timeOutMinutes && pmEndMinutes > timeOutMinutes) {
      errors.push("PM break end must be before time out")
    }

    // Check if PM break is longer than 10 minutes
    const pmBreakDuration = pmEndMinutes - pmStartMinutes
    if (pmBreakDuration > 10) {
      // This is not an error, just a warning that could be displayed to the user
      // errors.push("PM break exceeds 10 minutes and will be deducted from your total hours")
    }
  }

  // Check for California break time compliance
  // If shift is over 5 hours, a meal break is required
  if (timeInMinutes && timeOutMinutes) {
    const shiftDuration = timeOutMinutes - timeInMinutes
    if (shiftDuration > 5 * 60 && !mealStartMinutes) {
      errors.push("A meal break is required for shifts longer than 5 hours")
    }

    // If shift is over 10 hours, a second meal break is required (simplified check)
    if (shiftDuration > 10 * 60 && mealStartMinutes && mealEndMinutes) {
      const mealDuration = mealEndMinutes - mealStartMinutes
      if (mealDuration < 30) {
        errors.push("Meal break must be at least 30 minutes for shifts over 10 hours")
      }
    }

    // Rest breaks (10 minutes for every 4 hours)
    if (shiftDuration >= 3.5 * 60 && !amStartMinutes) {
      errors.push("A rest break is required for shifts of 3.5 hours or more")
    }

    if (shiftDuration >= 6 * 60 && !pmStartMinutes) {
      errors.push("A second rest break is required for shifts of 6 hours or more")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Helper function to convert time string to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
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

    // Calculate weekly totals
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
        am_break_end as "amBreakEnd",
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

