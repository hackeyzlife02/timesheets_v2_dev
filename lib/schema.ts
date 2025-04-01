import { pgTable, serial, varchar, boolean, timestamp, integer, text, decimal } from "drizzle-orm/pg-core"

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  employeeType: varchar("employee_type", { length: 20 }).default("hourly").notNull(), // "hourly" or "salary"
  weeklySalary: decimal("weekly_salary", { precision: 10, scale: 2 }).default("0").notNull(), // For salaried employees
  isActive: boolean("is_active").default(true).notNull(), // New field to track active status
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Timesheets table
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  certified: boolean("certified").default(false).notNull(),
  submissionDate: timestamp("submission_date"),
  adminApproved: boolean("admin_approved").default(false).notNull(), // Field for admin approval
  approvalDate: timestamp("approval_date"), // Field for when it was approved
  approvedBy: integer("approved_by").references(() => users.id), // Field for who approved it
  totalRegularHours: decimal("total_regular_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  totalOvertimeHours: decimal("total_overtime_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  totalDoubleTimeHours: decimal("total_double_time_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Timesheet days table
export const timesheetDays = pgTable("timesheet_days", {
  id: serial("id").primaryKey(),
  timesheetId: integer("timesheet_id")
    .notNull()
    .references(() => timesheets.id),
  dayName: varchar("day_name", { length: 10 }).notNull(), // monday, tuesday, etc.
  didNotWork: boolean("did_not_work").default(false).notNull(),
  timeIn: varchar("time_in", { length: 5 }),
  timeOut: varchar("time_out", { length: 5 }),
  mealBreakStart: varchar("meal_break_start", { length: 5 }),
  mealBreakEnd: varchar("meal_break_end", { length: 5 }),
  amBreakStart: varchar("am_break_start", { length: 5 }),
  amBreakEnd: varchar("am_break_end", { length: 5 }),
  pmBreakStart: varchar("pm_break_start", { length: 5 }),
  pmBreakEnd: varchar("pm_break_end", { length: 5 }),
  outOfTownHours: integer("out_of_town_hours").default(0).notNull(),
  outOfTownMinutes: integer("out_of_town_minutes").default(0).notNull(),
  reasons: text("reasons"),
  totalRegularHours: decimal("total_regular_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  totalOvertimeHours: decimal("total_overtime_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  totalDoubleTimeHours: decimal("total_double_time_hours", { precision: 5, scale: 2 }).default("0").notNull(),
  isSeventhConsecutiveDay: boolean("is_seventh_consecutive_day").default(false).notNull(),
})

