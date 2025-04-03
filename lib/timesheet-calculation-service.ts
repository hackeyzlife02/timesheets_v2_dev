import type { DayEntry, Timesheet } from "./timesheet"

/**
 * Centralized timesheet calculation service
 * This is the ONLY place where timesheet calculations should be performed
 * to ensure consistency across the entire application
 */

// Helper function to calculate hours between two time strings
export function calculateHoursBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const start = startHours * 60 + startMinutes
  const end = endHours * 60 + endMinutes

  // If end time is earlier than start time, assume it's the next day
  const minutesDiff = end < start ? 24 * 60 - start + end : end - start

  // Return exact value without rounding
  return minutesDiff / 60
}

// Calculate break duration in minutes directly
export function calculateBreakMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const start = startHours * 60 + startMinutes
  const end = endHours * 60 + endMinutes

  // If end time is earlier than start time, assume it's the next day
  return end < start ? 24 * 60 - start + end : end - start
}

// Function to calculate break duration in minutes (rounded to nearest minute)
export function calculateBreakDuration(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0

  // Create Date objects for calculation
  const time1 = new Date(`2000-01-01T${startTime}`)
  const time2 = new Date(`2000-01-01T${endTime}`)

  // Calculate duration in milliseconds
  const durationMs = Math.abs(time2.getTime() - time1.getTime())

  // Convert to minutes and round to nearest minute
  return Math.round(durationMs / (1000 * 60))
}

// Function to determine if a break should be deducted
export function shouldDeductBreak(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false
  const durationMinutes = calculateBreakDuration(startTime, endTime)
  return durationMinutes > 10
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
    // Calculate minutes directly to avoid floating point issues
    const amBreakMinutes = calculateBreakMinutes(dayData.amBreakStart, dayData.amBreakEnd)

    // Log for debugging
    console.log(`AM break minutes: ${amBreakMinutes}`)

    // If break is more than 10 minutes, subtract the entire break duration
    if (amBreakMinutes > 10) {
      const amBreakHours = amBreakMinutes / 60
      totalHours -= amBreakHours
      console.log(`AM break exceeds 10 minutes (${amBreakMinutes} min). Subtracting ${amBreakHours} hours.`)
    } else {
      console.log(`AM break is within 10 minutes (${amBreakMinutes} min). Not subtracting from total hours.`)
    }
  }

  // Handle PM break: only subtract if it's more than 10 minutes
  if (dayData.pmBreakStart && dayData.pmBreakEnd) {
    // Calculate minutes directly to avoid floating point issues
    const pmBreakMinutes = calculateBreakMinutes(dayData.pmBreakStart, dayData.pmBreakEnd)

    // Log for debugging
    console.log(`PM break minutes: ${pmBreakMinutes}`)

    // If break is more than 10 minutes, subtract the entire break duration
    if (pmBreakMinutes > 10) {
      const pmBreakHours = pmBreakMinutes / 60
      totalHours -= pmBreakHours
      console.log(`PM break exceeds 10 minutes (${pmBreakMinutes} min). Subtracting ${pmBreakHours} hours.`)
    } else {
      console.log(`PM break is within 10 minutes (${pmBreakMinutes} min). Not subtracting from total hours.`)
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

