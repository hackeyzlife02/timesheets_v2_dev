import { neon } from "@neondatabase/serverless"

// Create a SQL client with the connection string from environment variables
export const sql = neon(process.env.DATABASE_URL!)

// Export a function to create a fresh SQL client for each request
export function createFreshSqlClient() {
  return neon(process.env.DATABASE_URL!)
}

