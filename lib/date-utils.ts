/**
 * Utility functions for handling dates consistently across the application
 */

/**
 * Gets the start of the current week (Monday)
 * @returns Date object set to the start of the current week (Monday at 00:00:00)
 */
export function getStartOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1 // If Sunday, go back 6 days to previous Monday

  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0) // Set to midnight

  return monday
}

/**
 * Gets the end of the week (Sunday) based on a given start date (Monday)
 * @param startDate The start date of the week (Monday)
 * @returns Date object set to the end of the week (Sunday at 23:59:59)
 */
export function getEndOfWeek(startDate: Date): Date {
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6) // Add 6 days to get to Sunday
  endDate.setHours(23, 59, 59, 999) // Set to end of day
  return endDate
}

// Format a date for display
export function formatDate(dateString: string, includeTime = false): string {
  if (!dateString) return "N/A"

  const date = new Date(dateString)

  // Check if date is valid
  if (isNaN(date.getTime())) return "Invalid Date"

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }

  if (includeTime) {
    options.hour = "2-digit"
    options.minute = "2-digit"
  }

  return new Intl.DateTimeFormat("en-US", options).format(date)
}

/**
 * Checks if two dates represent the same day
 * @param date1 First date to compare
 * @param date2 Second date to compare
 * @returns True if both dates represent the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Adjusts a date for timezone issues
 * This is useful when dealing with date inputs that might be affected by timezone
 * @param date The date to adjust
 * @returns A new date object adjusted for timezone
 */
export function adjustForTimezone(date: Date): Date {
  // Create a new date to avoid modifying the original
  const adjusted = new Date(date)

  // Get the timezone offset in minutes and convert to milliseconds
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000

  // Adjust the date by adding the timezone offset
  adjusted.setTime(date.getTime() + timezoneOffset)

  return adjusted
}

// Get the current week's start (Monday) and end (Sunday) dates
export function getCurrentWeekDates() {
  const now = new Date()

  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = now.getDay()

  // Calculate days to subtract to get to Monday (if today is Sunday, subtract 6 days)
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1

  // Calculate the Monday date (start of week)
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  // Set to noon to avoid timezone issues
  monday.setHours(12, 0, 0, 0)

  // Calculate the Sunday date (end of week)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(12, 0, 0, 0)

  return {
    weekStartDate: monday,
    weekEndDate: sunday,
  }
}

// Add days to a date
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(date.getDate() + days)
  return result
}

// Get the Monday of the week for a given date
export function getMondayOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  const monday = new Date(date)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Get the Sunday of the week for a given date
export function getSundayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

