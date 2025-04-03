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
export function calculateDailyHours(day: TimesheetDay, dayInfo?: string): number {
  if (!day.startTime || !day.endTime) return 0

  const dayPrefix = dayInfo ? `${dayInfo} - ` : ""

  // Calculate total work duration
  const totalMinutes = roundToNearestMinute(day.startTime, day.endTime)
  let totalHours = totalMinutes / 60

  console.log(
    `${dayPrefix}Work hours: ${day.startTime} to ${day.endTime} = ${totalHours.toFixed(2)} hours (${totalMinutes} minutes)`,
  )

  // Deduct lunch break (always deducted if present)
  if (day.lunchBreakStart && day.lunchBreakEnd) {
    const lunchMinutes = roundToNearestMinute(day.lunchBreakStart, day.lunchBreakEnd)
    const lunchHours = lunchMinutes / 60
    totalHours -= lunchHours
    console.log(
      `${dayPrefix}Lunch break: ${day.lunchBreakStart} to ${day.lunchBreakEnd} = ${lunchHours.toFixed(2)} hours (${lunchMinutes} minutes) - DEDUCTED`,
    )
  }

  // Check AM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.amBreakStart && day.amBreakEnd) {
    // Log the raw time values
    console.log(`${dayPrefix}AM break raw times: start=${day.amBreakStart}, end=${day.amBreakEnd}`)

    // Create Date objects for detailed logging
    const amStart = new Date(`2000-01-01T${day.amBreakStart}`)
    const amEnd = new Date(`2000-01-01T${day.amBreakEnd}`)

    // Log the Date objects and their time values
    console.log(`${dayPrefix}AM break Date objects: start=${amStart.toISOString()}, end=${amEnd.toISOString()}`)
    console.log(`${dayPrefix}AM break milliseconds: ${amEnd.getTime() - amStart.getTime()} ms`)

    // Calculate minutes with detailed logging
    const amBreakMs = amEnd.getTime() - amStart.getTime()
    const amBreakMinutesExact = amBreakMs / (1000 * 60)
    const amBreakMinutes = Math.round(amBreakMinutesExact)

    console.log(`${dayPrefix}AM break exact minutes: ${amBreakMinutesExact}, rounded: ${amBreakMinutes}`)

    if (amBreakMinutes > 10) {
      const amBreakHours = amBreakMinutes / 60
      totalHours -= amBreakHours
      console.log(
        `${dayPrefix}AM break exceeds 10 minutes (${amBreakMinutes} min). Subtracting ${amBreakHours.toFixed(2)} hours.`,
      )
    } else {
      console.log(`${dayPrefix}AM break within 10 minutes (${amBreakMinutes} min). Not deducting.`)
    }
  }

  // Check PM break - only deduct if over 10 minutes (rounded to nearest minute)
  if (day.pmBreakStart && day.pmBreakEnd) {
    // Log the raw time values
    console.log(`${dayPrefix}PM break raw times: start=${day.pmBreakStart}, end=${day.pmBreakEnd}`)

    // Create Date objects for detailed logging
    const pmStart = new Date(`2000-01-01T${day.pmBreakStart}`)
    const pmEnd = new Date(`2000-01-01T${day.pmBreakEnd}`)

    // Log the Date objects and their time values
    console.log(`${dayPrefix}PM break Date objects: start=${pmStart.toISOString()}, end=${pmEnd.toISOString()}`)
    console.log(`${dayPrefix}PM break milliseconds: ${pmEnd.getTime() - pmStart.getTime()} ms`)

    // Calculate minutes with detailed logging
    const pmBreakMs = pmEnd.getTime() - pmStart.getTime()
    const pmBreakMinutesExact = pmBreakMs / (1000 * 60)
    const pmBreakMinutes = Math.round(pmBreakMinutesExact)

    console.log(`${dayPrefix}PM break exact minutes: ${pmBreakMinutesExact}, rounded: ${pmBreakMinutes}`)

    if (pmBreakMinutes > 10) {
      const pmBreakHours = pmBreakMinutes / 60
      totalHours -= pmBreakHours
      console.log(
        `${dayPrefix}PM break exceeds 10 minutes (${pmBreakMinutes} min). Subtracting ${pmBreakHours.toFixed(2)} hours.`,
      )
    } else {
      console.log(`${dayPrefix}PM break within 10 minutes (${pmBreakMinutes} min). Not deducting.`)
    }
  }

  // Round to 2 decimal places
  const roundedHours = Math.round(totalHours * 100) / 100
  console.log(`${dayPrefix}Final hours after all deductions: ${roundedHours}`)

  return roundedHours
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

// Import and re-export functions from the centralized service
import { calculateDayHours, calculateWeeklyTotals, validateBreakTimes } from "./timesheet-calculation-service"

export { calculateDayHours, calculateWeeklyTotals, validateBreakTimes }

