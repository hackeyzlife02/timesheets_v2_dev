// Helper function to get the start of the current week (Monday)
export function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Helper function to format date as YYYY-MM-DD
export function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to check if a date is in the current week
export function isWeekCurrent(date: Date): boolean {
  const today = new Date()
  const currentWeekStart = new Date(today)
  const day = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  const diff = day === 0 ? 6 : day - 1 // Adjust to get Monday
  currentWeekStart.setDate(today.getDate() - diff)
  currentWeekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(date)
  weekEnd.setDate(date.getDate() + 6)

  return date <= today && today <= weekEnd
}

// Helper function to check if a date is in the past
export function isPastDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekEnd = new Date(date)
  weekEnd.setDate(date.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return weekEnd < today
}

