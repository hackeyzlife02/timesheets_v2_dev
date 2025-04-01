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
 * Formats a date as YYYY-MM-DD
 * @param date The date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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

