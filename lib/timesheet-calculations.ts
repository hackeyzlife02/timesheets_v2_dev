import type { TimesheetDay } from "@/types"

// Function to round time difference to nearest minute
export function roundToNearestMinute(timeString1: string, timeString2: string): number {
  const time1 = new Date(`2000-01-01T${timeString1}`)
  const time2 = new Date(`2000-01-01T${timeString2}`)

  // Calculate duration in milliseconds
  const durationMs = Math.abs(time2.getTime() - time1.getTime())

  // Convert to minutes and round to nearest minute
  return Math.round(durationMs / (1000 * 60))
}

// Function to calculate total hours worked for a day
export function calculateDailyHours(day: TimesheetDay): number {
  if (!day.startTime || !day.endTime) return 0

  // Calculate total work duration
  const totalMinutes = roundToNearestMinute(day.startTime, day.endTime)
  let totalHours = totalMinutes / 60

  // Deduct lunch break (always deducted if present)
  if (day.lunchBreakStart && day.lunchBreakEnd) {
    const lunchMinutes = roundToNearestMinute(day.lunchBreakStart, day.lunchBreakEnd)
    totalHours -= lunchMinutes / 60
  }

  // Check AM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.amBreakStart && day.amBreakEnd) {
    const amBreakMinutes = roundToNearestMinute(day.amBreakStart, day.amBreakEnd)

    if (amBreakMinutes > 10) {
      const amBreakHours = amBreakMinutes / 60
      totalHours -= amBreakHours
      console.log(`AM break exceeds 10 minutes (${amBreakMinutes} min). Subtracting ${amBreakHours.toFixed(2)} hours.`)
    } else {
      console.log(`AM break within 10 minutes (${amBreakMinutes} min). Not deducting.`)
    }
  }

  // Check PM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.pmBreakStart && day.pmBreakEnd) {
    const pmBreakMinutes = roundToNearestMinute(day.pmBreakStart, day.pmBreakEnd)

    if (pmBreakMinutes > 10) {
      const pmBreakHours = pmBreakMinutes / 60
      totalHours -= pmBreakHours
      console.log(`PM break exceeds 10 minutes (${pmBreakMinutes} min). Subtracting ${pmBreakHours.toFixed(2)} hours.`)
    } else {
      console.log(`PM break within 10 minutes (${pmBreakMinutes} min). Not deducting.`)
    }
  }

  // Round to 2 decimal places
  return Math.round(totalHours * 100) / 100
}

// Function to calculate break duration in minutes (rounded to nearest minute)
export function calculateBreakDuration(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0
  return roundToNearestMinute(startTime, endTime)
}

// Function to determine if a break should be deducted
export function shouldDeductBreak(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false
  const durationMinutes = calculateBreakDuration(startTime, endTime)
  return durationMinutes > 10
}

