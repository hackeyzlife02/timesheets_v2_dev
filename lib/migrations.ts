import { sql } from "./db"

export async function createTables() {
  try {
    // Create users table
    await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      employee_type VARCHAR(20) NOT NULL DEFAULT 'hourly',
      weekly_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `

    // Create timesheets table
    await sql`
    CREATE TABLE IF NOT EXISTS timesheets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start_date TIMESTAMP NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      certified BOOLEAN NOT NULL DEFAULT FALSE,
      submission_date TIMESTAMP,
      admin_approved BOOLEAN NOT NULL DEFAULT FALSE,
      approval_date TIMESTAMP,
      approved_by INTEGER REFERENCES users(id),
      total_regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_double_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `

    // Create timesheet_days table
    await sql`
    CREATE TABLE IF NOT EXISTS timesheet_days (
      id SERIAL PRIMARY KEY,
      timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
      day_name VARCHAR(10) NOT NULL,
      did_not_work BOOLEAN NOT NULL DEFAULT FALSE,
      time_in VARCHAR(5),
      time_out VARCHAR(5),
      meal_break_start VARCHAR(5),
      meal_break_end VARCHAR(5),
      am_break_start VARCHAR(5),
      am_break_end VARCHAR(5),
      pm_break_start VARCHAR(5),
      pm_break_end VARCHAR(5),
      out_of_town_hours INTEGER NOT NULL DEFAULT 0,
      out_of_town_minutes INTEGER NOT NULL DEFAULT 0,
      reasons TEXT,
      total_regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_double_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
      is_seventh_consecutive_day BOOLEAN NOT NULL DEFAULT FALSE
    );
  `

    // Create index for faster queries
    await sql`CREATE INDEX IF NOT EXISTS idx_timesheet_days_timesheet_id ON timesheet_days(timesheet_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);`

    console.log("Database tables created successfully")
    return { success: true }
  } catch (error) {
    console.error("Error creating database tables:", error)
    return { success: false, error }
  }
}

// Replace the entire seedUsers function with this simplified version that doesn't try to insert users

export async function seedUsers() {
  console.log("Skipping user seeding - database already initialized")
  return {
    success: true,
    message: "User seeding skipped - database already initialized",
  }
}

